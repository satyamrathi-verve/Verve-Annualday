import { getSupabase } from "@/lib/supabase/client";
import { sessionFromEmail, validatedSessionFromSupabase } from "./session";
import type { AuthBackend, Session } from "./types";

const ALLOWED_DOMAIN = "verveadvisory.com";

/*
  Real auth via Google (Supabase Auth → Google provider). No email is sent, so
  no SMTP / rate limits. Sign-in redirects to Google and back; the session then
  arrives via onChange. Configure the provider in the Supabase dashboard and an
  OAuth client in Google Cloud (consent screen "Internal" auto-restricts to the
  Verve Workspace domain).
*/
export class GoogleAuthBackend implements AuthBackend {
  readonly mode = "google" as const;

  async getSession(): Promise<Session | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    return validatedSessionFromSupabase(supabase);
  }

  onChange(cb: (session: Session | null) => void): () => void {
    const supabase = getSupabase();
    if (!supabase) return () => {};
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(sessionFromEmail(session?.user?.email));
    });
    return () => data.subscription.unsubscribe();
  }

  async signInWithGoogle(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        // Prefer the Verve Workspace account in the Google chooser.
        queryParams: { hd: ALLOWED_DOMAIN, prompt: "select_account" },
      },
    });
    if (error) throw new Error(error.message);
    // The browser now redirects to Google; the session arrives via onChange.
  }

  // Email OTP alongside Google — for whitelisted external/Gmail addresses (e.g.
  // the host) that can't use the Verve-workspace Google flow. Supabase supports
  // both on one project. The SignIn screen surfaces this as a secondary option.
  async sendCode(email: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) throw new Error(error.message);
  }

  async verifyCode(email: string, token: string): Promise<Session> {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");
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
