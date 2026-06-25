import { getSupabase } from "@/lib/supabase/client";
import { sessionFromEmail } from "./session";
import type { AuthBackend, Session } from "./types";

/*
  Passwordless auth via Supabase email OTP (fallback when Google isn't used).
  The person enters their Verve email; Supabase emails a 6-digit code (and/or a
  magic link). Typing the code stays in-app. NOTE: Supabase's built-in email is
  rate-limited — configure custom SMTP for real volume.
*/
export class EmailAuthBackend implements AuthBackend {
  readonly mode = "email" as const;

  async getSession(): Promise<Session | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return sessionFromEmail(data.session?.user?.email);
  }

  onChange(cb: (session: Session | null) => void): () => void {
    const supabase = getSupabase();
    if (!supabase) return () => {};
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(sessionFromEmail(session?.user?.email));
    });
    return () => data.subscription.unsubscribe();
  }

  async sendCode(email: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) throw new Error(error.message);
  }

  async verifyCode(email: string, token: string): Promise<Session> {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");
    // New emails verify as "signup", returning ones as "email" — try both.
    const types = ["email", "signup"] as const;
    let lastError: string | null = null;
    for (const type of types) {
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type });
      if (!error && data.session) {
        const session = sessionFromEmail(data.session.user?.email ?? email);
        if (session) return session;
      }
      lastError = error?.message ?? lastError;
    }
    throw new Error(lastError ?? "That code didn't work — request a new one.");
  }

  async signOut(): Promise<void> {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
  }
}
