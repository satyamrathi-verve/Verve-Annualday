import { getSupabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { GODMODE_GUESSER } from "./derive";
import type { GuessEdge, RealtimeBackend, TeamRoom, TeamRoomCallbacks } from "./types";

interface GuessRow {
  guesser_id: string;
  guessed_id: string;
}

// Live realtime channel per team topic ON THIS CLIENT. A fast remount must tear
// down the previous channel before re-subscribing — supabase-js throws if the
// same topic is subscribed twice. Keyed by topic so each team has at most one.
const liveChannels = new Map<string, RealtimeChannel>();

/*
  Real transport. State lives in the `guesses` table (one row per correct guess);
  we subscribe to postgres changes (filtered by team) and re-snapshot on any
  change — trivial at a few dozen rows and avoids fragile per-event merging.
  Presence rides the same channel so the wheel shows who's currently in the room.
*/
export class SupabaseRealtimeBackend implements RealtimeBackend {
  readonly kind = "supabase" as const;

  async readTeam(teamId: string): Promise<GuessEdge[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("guesses")
      .select("guesser_id, guessed_id")
      .eq("team_id", teamId);
    if (error) {
      console.error("[wheel] readTeam failed:", error.message);
      return [];
    }
    return ((data ?? []) as GuessRow[]).map((r) => ({
      guesserId: r.guesser_id,
      guessedId: r.guessed_id,
    }));
  }

  async joinTeam(
    teamId: string,
    selfMemberId: string,
    cb: TeamRoomCallbacks,
  ): Promise<TeamRoom> {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase is not configured");

    const snapshot = async () => {
      const { data, error } = await supabase
        .from("guesses")
        .select("guesser_id, guessed_id")
        .eq("team_id", teamId);
      if (error) {
        console.error("[wheel] snapshot read failed:", error.message);
        return;
      }
      const rows = (data ?? []) as GuessRow[];
      const edges: GuessEdge[] = rows.map((r) => ({
        guesserId: r.guesser_id,
        guessedId: r.guessed_id,
      }));
      cb.onGuesses(edges);
    };

    const insertEdge = async (guesserId: string, guessedId: string) => {
      const { error } = await supabase.from("guesses").upsert(
        {
          team_id: teamId,
          guesser_id: guesserId,
          guessed_id: guessedId,
          created_at: new Date().toISOString(),
        },
        { onConflict: "team_id,guesser_id,guessed_id" },
      );
      if (error) {
        console.error("[wheel] guess write failed:", error.message);
        return;
      }
      // Optimistic: refresh our OWN view immediately so the guesser sees the
      // canister react (→ yellow) without waiting on the realtime round-trip.
      await snapshot();
    };

    // Initial load so the wheel renders even if realtime never connects.
    await snapshot();

    // Convergence poll — the RELIABLE cross-client sync path. Realtime makes
    // updates instant; this guarantees every client converges (so a teammate's
    // guess-back flips you green) within a few seconds even if the channel is
    // down. Cheap at a few dozen rows.
    const poll = setInterval(() => {
      void snapshot();
    }, 3000);

    // Realtime (live echoes + presence) is BEST-EFFORT. supabase-js throws if a
    // topic is re-subscribed (StrictMode/HMR, or hopping in/out of the wheel via
    // the nav), which previously rejected joinTeam and left a DEAD room (guesses
    // were no-ops). Tear down any stale channel for this topic first, and wrap
    // setup so any failure still leaves a WORKING room (direct writes + poll).
    const topic = `team:${teamId}`;
    let channel: RealtimeChannel | null = null;
    try {
      const prev = liveChannels.get(topic);
      if (prev) {
        liveChannels.delete(topic);
        await supabase.removeChannel(prev);
      }
      channel = supabase.channel(topic, { config: { presence: { key: selfMemberId } } });
      liveChannels.set(topic, channel);

      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guesses", filter: `team_id=eq.${teamId}` },
        () => void snapshot(),
      );
      channel.on("presence", { event: "sync" }, () => {
        cb.onPresence?.(Object.keys(channel!.presenceState()));
      });
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel!.track({ memberId: selfMemberId, at: new Date().toISOString() });
          void snapshot();
        }
      });
    } catch (err) {
      console.warn("[wheel] realtime unavailable; using poll only:", (err as Error).message);
    }

    return {
      guess: (guesserId, guessedId) => insertEdge(guesserId, guessedId),
      reveal: (memberId) => insertEdge(GODMODE_GUESSER, memberId),
      reset: async () => {
        const { error } = await supabase.from("guesses").delete().eq("team_id", teamId);
        if (error) {
          console.error("[wheel] reset failed:", error.message);
          return;
        }
        await snapshot();
      },
      leave: () => {
        clearInterval(poll);
        if (channel) {
          if (liveChannels.get(topic) === channel) liveChannels.delete(topic);
          void supabase.removeChannel(channel);
        }
      },
    };
  }
}
