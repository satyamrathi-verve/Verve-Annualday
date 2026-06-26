/*
  Realtime abstraction for the shared team wheel. The Guess screen talks to a
  TeamRoom; it doesn't know or care whether it's backed by Supabase (real,
  cross-device) or the BroadcastChannel mock (local, cross-tab). Swapping the
  transport later (self-hosted WS, Pusher, …) means one new RealtimeBackend.

  The wheel state is a DIRECTED GUESS GRAPH: each edge says "guesser correctly
  identified guessed". Canister colour is derived from it (see derive.ts) — a
  canister turns green only when two members guess each other.
*/

/** One correct guess: `guesserId` identified `guessedId`. */
export interface GuessEdge {
  guesserId: string;
  guessedId: string;
}

export interface TeamRoomCallbacks {
  /** Full snapshot of the team's guess edges. */
  onGuesses: (edges: GuessEdge[]) => void;
  /** Member ids currently present in the room. */
  onPresence?: (onlineMemberIds: string[]) => void;
}

export interface TeamRoom {
  /** Record that `guesserId` correctly guessed `guessedId`. */
  guess: (guesserId: string, guessedId: string) => Promise<void>;
  /** Manager override: force a member's canister green regardless of guesses. */
  reveal: (memberId: string) => Promise<void>;
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
