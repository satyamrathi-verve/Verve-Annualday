/*
  Auth abstraction. The funnel talks to this interface (via useAuth), never to a
  concrete implementation. Default is EmailAuthBackend (real Verve-email sign-in
  via Supabase, passwordless). MockAuthBackend (name picker) stays available as a
  fallback behind NEXT_PUBLIC_AUTH_MODE=mock for offline demos.
*/

export interface Session {
  /** Verified email — the stable identity. */
  email: string;
  displayName: string;
  /** Roster linkage — null until this email exists in the roster (config). */
  memberId: string | null;
  teamId: string | null;
  isManager: boolean;
  /** Super admin sees the all-teams dashboard instead of the funnel. */
  isSuperAdmin: boolean;
}

export type AuthMode = "google" | "email" | "mock";

export interface AuthBackend {
  readonly mode: AuthMode;
  /** Restore a persisted session if one exists (refresh / OAuth return). */
  getSession(): Promise<Session | null>;
  /** Subscribe to session changes (OAuth return, sign-out). Returns an unsubscribe. */
  onChange(cb: (session: Session | null) => void): () => void;
  signOut(): Promise<void>;

  // --- google flow (mode: "google") ---
  /** Redirect to Google; session arrives via onChange on return. */
  signInWithGoogle?(): Promise<void>;

  // --- email flow (mode: "email") ---
  /** Email a one-time code. */
  sendCode?(email: string): Promise<void>;
  /** Verify the typed one-time code. */
  verifyCode?(email: string, token: string): Promise<Session>;

  // --- mock flow (mode: "mock") ---
  listMembers?(): Array<{ id: string; displayName: string }>;
  signInAs?(memberId: string): Promise<Session | null>;
}
