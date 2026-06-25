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
