import { getSupabase } from "@/lib/supabase/client";
import { GODMODE_GUESSER } from "./derive";
import type { GuessEdge, RealtimeBackend, TeamRoom, TeamRoomCallbacks } from "./types";

interface GuessRow {
  guesser_id: string;
  guessed_id: string;
}

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

    const channel = supabase.channel(`team:${teamId}`, {
      config: { presence: { key: selfMemberId } },
    });

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "guesses",
        filter: `team_id=eq.${teamId}`,
      },
      () => {
        void snapshot();
      },
    );

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      cb.onPresence?.(Object.keys(state));
    });

    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ memberId: selfMemberId, at: new Date().toISOString() });
          await snapshot();
          done();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          // Realtime didn't come up — still return a usable room (direct reads /
          // writes work; we just won't get live echoes). Better than a dead wheel.
          console.warn(`[wheel] realtime channel ${status}; continuing without live echo`);
          await snapshot();
          done();
        }
      });
      // Safety net: never hang the wheel forever if realtime never connects.
      setTimeout(() => {
        if (!settled) {
          console.warn("[wheel] realtime subscribe timed out; continuing without live echo");
          void snapshot();
          done();
        }
      }, 4000);
    });

    // Convergence poll: realtime can miss a postgres_changes echo during the
    // subscription's cold-start bind window. In the guess model a watching player
    // never writes, so a missed echo would leave their wheel stale until THEY act
    // (which looked like "green only appears after my own next guess"). A light
    // periodic re-snapshot guarantees every client converges within a few seconds
    // regardless. Cheap at a few dozen rows.
    const poll = setInterval(() => {
      void snapshot();
    }, 4000);

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
      // canister react without waiting on the realtime round-trip. Other clients
      // still update via their postgres_changes subscription.
      await snapshot();
    };

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
        void supabase.removeChannel(channel);
      },
    };
  }
}
