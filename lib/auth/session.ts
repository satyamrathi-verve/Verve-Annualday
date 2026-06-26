import type { SupabaseClient } from "@supabase/supabase-js";
import { getMemberByEmail, getSuperAdmin } from "@/lib/data/config";
import type { Session } from "./types";

function prettyName(email: string): string {
  const local = email.split("@")[0] ?? email;
  const words = local
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  return words.join(" ") || email;
}

/*
  Build our Session from a verified email (from Google or email OTP), enriching
  it with roster data (team, manager, clues source) when the email matches a
  roster entry. Until the real roster is added, memberId/teamId stay null and we
  show a friendly "name from email" so the funnel still works.
*/
export function sessionFromEmail(email?: string | null): Session | null {
  if (!email) return null;
  const lower = email.toLowerCase();
  const admin = getSuperAdmin(lower);
  const member = getMemberByEmail(lower);
  return {
    email: lower,
    displayName: admin?.name ?? member?.displayName ?? prettyName(lower),
    memberId: member?.id ?? null,
    teamId: member?.teamId ?? null,
    isManager: member?.isManager ?? false,
    isSuperAdmin: Boolean(admin),
  };
}

/*
  Resolve the current session, VALIDATED against the server. getSession() only
  reads the locally-cached token, so a user deleted/disabled in Supabase still
  looks "signed in" until their token expires. getUser() round-trips to Supabase
  and rejects an invalid token — we use it to detect (and clear) those stale
  sessions on load. A transient network/5xx error doesn't log anyone out: we
  fall back to the cached session in that case.
*/
export async function validatedSessionFromSupabase(
  supabase: SupabaseClient,
): Promise<Session | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;

  const { data: userData, error } = await supabase.auth.getUser();
  if (userData.user) return sessionFromEmail(userData.user.email);

  // No user came back. A 4xx means the token/user is genuinely invalid (e.g. the
  // account was deleted) → clear the stale local session. Anything else (network
  // blip / 5xx) shouldn't sign out a legitimate user — keep the cached session.
  const status = error?.status;
  if (status && status >= 400 && status < 500) {
    await supabase.auth.signOut();
    return null;
  }
  return sessionFromEmail(sessionData.session.user?.email);
}
