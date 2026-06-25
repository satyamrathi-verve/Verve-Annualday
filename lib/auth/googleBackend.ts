import { getSupabase } from "@/lib/supabase/client";
import { sessionFromEmail } from "./session";
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

  async signOut(): Promise<void> {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
  }
}
