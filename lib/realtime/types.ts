/*
  Realtime abstraction for the shared team wheel. The Guess screen talks to a
  TeamRoom; it doesn't know or care whether it's backed by Supabase (real,
  cross-device) or the BroadcastChannel mock (local, cross-tab). Swapping the
  transport later (self-hosted WS, Pusher, …) means one new RealtimeBackend.
*/

export type LitMethod = "guess" | "godmode" | "self";

export interface CanisterState {
  memberId: string;
  lit: boolean;
  litBy: string | null;
  method: LitMethod | null;
}

export interface TeamRoomCallbacks {
  /** Full snapshot of currently-lit canisters for the team. */
  onCanisters: (states: CanisterState[]) => void;
  /** Member ids currently present in the room. */
  onPresence?: (onlineMemberIds: string[]) => void;
}

export interface TeamRoom {
  /** Light a canister for everyone in the room. */
  light: (memberId: string, method: LitMethod, byMemberId: string) => Promise<void>;
  /** Clear the whole team's wheel (admin / demo re-run). */
  reset: () => Promise<void>;
  leave: () => void;
}

export interface RealtimeBackend {
  readonly kind: "supabase" | "mock";
  joinTeam: (
    teamId: string,
    selfMemberId: string,
    callbacks: TeamRoomCallbacks,
  ) => Promise<TeamRoom>;
}
