/*
  Auth abstraction. The whole funnel talks to this interface (via useAuth),
  never to a concrete implementation. Today it's backed by MockAuthBackend
  (pick-your-name). Phase 2 swaps in a GoogleAuthBackend (Auth.js / Supabase
  Auth) by implementing this same interface and flipping NEXT_PUBLIC_AUTH_MODE
  — no screen changes required.
*/

export interface Session {
  /** == the (mock) Verve ID; the roster member's stable id. */
  memberId: string;
  displayName: string;
  teamId: string;
  isManager: boolean;
}

export interface AuthBackend {
  /** Restore a persisted session if one exists (e.g. on refresh). */
  getSession(): Session | null;
  /** Mock sign-in: become a known roster member. */
  signInAs(memberId: string): Session | null;
  /** Real OAuth (Phase 2). The mock throws so the UI falls back to the picker. */
  signInWithGoogle(): Promise<Session>;
  signOut(): void;
}
