import { getSupabase } from "@/lib/supabase/client";
import type {
  CanisterState,
  LitMethod,
  RealtimeBackend,
  TeamRoom,
  TeamRoomCallbacks,
} from "./types";

interface CanisterRow {
  member_id: string;
  lit: boolean;
  lit_by: string | null;
  method: LitMethod | null;
}

/*
  Real transport. State lives in the `canister_state` table; we subscribe to
  postgres changes (filtered by team) and re-snapshot on any change — trivial
  at ~12 rows and avoids fragile per-event merging. Presence rides the same
  channel so the wheel shows who's currently in the room.
*/
export class SupabaseRealtimeBackend implements RealtimeBackend {
  readonly kind = "supabase" as const;

  async joinTeam(
    teamId: string,
    selfMemberId: string,
    cb: TeamRoomCallbacks,
  ): Promise<TeamRoom> {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase is not configured");

    const snapshot = async () => {
      const { data, error } = await supabase
        .from("canister_state")
        .select("member_id, lit, lit_by, method")
        .eq("team_id", teamId);
      if (error) return;
      const rows = (data ?? []) as CanisterRow[];
      const states: CanisterState[] = rows.map((r) => ({
        memberId: r.member_id,
        lit: r.lit,
        litBy: r.lit_by,
        method: r.method,
      }));
      cb.onCanisters(states);
    };

    const channel = supabase.channel(`team:${teamId}`, {
      config: { presence: { key: selfMemberId } },
    });

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "canister_state",
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
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ memberId: selfMemberId, at: new Date().toISOString() });
          await snapshot();
          resolve();
        }
      });
    });

    return {
      light: async (memberId, method, byMemberId) => {
        await supabase.from("canister_state").upsert(
          {
            team_id: teamId,
            member_id: memberId,
            lit: true,
            lit_by: byMemberId,
            method,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "team_id,member_id" },
        );
      },
      reset: async () => {
        await supabase.from("canister_state").delete().eq("team_id", teamId);
      },
      leave: () => {
        void supabase.removeChannel(channel);
      },
    };
  }
}
