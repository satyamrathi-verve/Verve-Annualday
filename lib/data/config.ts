import eventJson from "@/config/event.json";
import { eventSchema, type EventConfig } from "./schema";
import {
  getMemberByEmailSnapshot,
  getMemberSnapshot,
  getRosterSortedSnapshot,
  getTeamMembersSnapshot,
  getTeamSnapshot,
  getTeamsSnapshot,
  hydrateRoster,
  type StoreMember,
  type StoreTeam,
} from "./store";

/*
  Event copy + super-admin list stay in /config/event.json (static — they don't
  change during the event). Teams, members and clues now live in Supabase and are
  served through ./store (JSON seed + live hydration). The helpers below are the
  one public surface the app reads people-data through.
*/

function parseOrThrow<T>(label: string, schema: { parse: (v: unknown) => T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (err) {
    throw new Error(`Invalid config/${label}.json — ${(err as Error).message}`);
  }
}

export const event: EventConfig = parseOrThrow("event", eventSchema, eventJson);

/** Load live roster/teams from Supabase (no-op fallback to JSON seed). */
export { hydrateRoster };

export function getMember(id: string): StoreMember | undefined {
  return getMemberSnapshot(id);
}

/** Match a (Google/email-authed) person to their roster entry by email. */
export function getMemberByEmail(email: string): StoreMember | undefined {
  return getMemberByEmailSnapshot(email);
}

/** A super admin (all-teams dashboard + control panel) matched by email, if any. */
export function getSuperAdmin(email: string): { name: string; email: string } | undefined {
  const lower = email.toLowerCase();
  return event.superAdmins.find((a) => a.email.toLowerCase() === lower);
}

export function getTeam(id: string): StoreTeam | undefined {
  return getTeamSnapshot(id);
}

/** All teams, in display order. */
export function getTeams(): StoreTeam[] {
  return getTeamsSnapshot();
}

/** Members of a team, in the team's declared canister order. */
export function getTeamMembers(teamId: string): StoreMember[] {
  return getTeamMembersSnapshot(teamId);
}

/**
 * The teammates a member is responsible for guessing.
 *
 * - Explicit `guessTargets` (scripted demo / special pairings) are used verbatim.
 * - Otherwise the two "ring neighbours" in the team's order. Neighbour links are
 *   symmetric, so every default guess is reciprocated and any team can light its
 *   whole wheel green. A canister only turns green when two members guess each
 *   other. Unplaced members (no team) have no targets.
 */
export function getGuessTargets(memberId: string): string[] {
  const member = getMemberSnapshot(memberId);
  if (!member || !member.teamId) return [];
  if (member.guessTargets && member.guessTargets.length > 0) {
    return member.guessTargets;
  }
  const ids = getTeamMembersSnapshot(member.teamId).map((m) => m.id);
  const i = ids.indexOf(memberId);
  if (i < 0 || ids.length < 2) return [];
  const prev = ids[(i - 1 + ids.length) % ids.length];
  const next = ids[(i + 1) % ids.length];
  // A team of exactly two collapses prev === next — guess them once.
  return prev === next ? [next] : [prev, next];
}

/** Everyone, sorted for the sign-in name picker. */
export function getRosterSorted(): StoreMember[] {
  return getRosterSortedSnapshot();
}
