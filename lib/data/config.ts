import eventJson from "@/config/event.json";
import rosterJson from "@/config/roster.json";
import teamsJson from "@/config/teams.json";
import {
  eventSchema,
  rosterSchema,
  teamsSchema,
  type EventConfig,
  type Member,
  type Team,
} from "./schema";

/*
  Loads + validates all config once, at module load. If any config file is
  malformed, zod throws here with a precise path — fail loudly, never ship
  a half-broken roster. Everything downstream imports the typed values below.
*/

function parseOrThrow<T>(label: string, schema: { parse: (v: unknown) => T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (err) {
    throw new Error(`Invalid config/${label}.json — ${(err as Error).message}`);
  }
}

export const event: EventConfig = parseOrThrow("event", eventSchema, eventJson);
export const roster: Member[] = parseOrThrow("roster", rosterSchema, rosterJson);
export const teams: Team[] = parseOrThrow("teams", teamsSchema, teamsJson);

// Cross-checks: every team member must exist in the roster, and vice-versa.
const rosterIds = new Set(roster.map((m) => m.id));
for (const team of teams) {
  for (const id of team.memberIds) {
    if (!rosterIds.has(id)) {
      throw new Error(`Team "${team.id}" references unknown member "${id}"`);
    }
  }
}

// Explicit guess targets must be real members on the SAME team (you can only
// guess a teammate). Catches typos in the scripted assignments at load time.
for (const m of roster) {
  for (const t of m.guessTargets ?? []) {
    const target = roster.find((r) => r.id === t);
    if (!target) {
      throw new Error(`Member "${m.id}" has unknown guessTarget "${t}"`);
    }
    if (target.teamId !== m.teamId) {
      throw new Error(
        `Member "${m.id}" guessTarget "${t}" is on a different team ("${target.teamId}" ≠ "${m.teamId}")`,
      );
    }
    if (t === m.id) {
      throw new Error(`Member "${m.id}" cannot guess themselves`);
    }
  }
}

const memberById = new Map(roster.map((m) => [m.id, m]));
const memberByEmail = new Map(
  roster.filter((m) => m.email).map((m) => [m.email!.toLowerCase(), m]),
);
const teamById = new Map(teams.map((t) => [t.id, t]));

export function getMember(id: string): Member | undefined {
  return memberById.get(id);
}

/** Match a (Google/email-authed) person to their roster entry by email. */
export function getMemberByEmail(email: string): Member | undefined {
  return memberByEmail.get(email.toLowerCase());
}

/** A super admin (all-teams dashboard) matched by email, if any. */
export function getSuperAdmin(email: string): { name: string; email: string } | undefined {
  const lower = email.toLowerCase();
  return event.superAdmins.find((a) => a.email.toLowerCase() === lower);
}

export function getTeam(id: string): Team | undefined {
  return teamById.get(id);
}

/** Members of a team, in the team's declared canister order. */
export function getTeamMembers(teamId: string): Member[] {
  const team = teamById.get(teamId);
  if (!team) return [];
  return team.memberIds.map((id) => memberById.get(id)).filter((m): m is Member => Boolean(m));
}

/**
 * The teammates a member is responsible for guessing.
 *
 * - If the member has an explicit `guessTargets` list (scripted demo, special
 *   pairings), use it verbatim.
 * - Otherwise default to their two "ring neighbours" — the members immediately
 *   before and after them in the team's declared order. Because neighbour links
 *   are symmetric (A's next is B, and B's prev is A), every default guess is
 *   reciprocated, so any team can light its whole wheel green.
 *
 * A canister only turns green when two members guess EACH OTHER, so these
 * assignments are what make mutual confirmation possible.
 */
export function getGuessTargets(memberId: string): string[] {
  const member = memberById.get(memberId);
  if (!member) return [];
  if (member.guessTargets && member.guessTargets.length > 0) {
    return member.guessTargets;
  }
  const team = teamById.get(member.teamId);
  const ids = team?.memberIds ?? [];
  const i = ids.indexOf(memberId);
  if (i < 0 || ids.length < 2) return [];
  const prev = ids[(i - 1 + ids.length) % ids.length];
  const next = ids[(i + 1) % ids.length];
  // A team of exactly two collapses prev === next — guess them once.
  return prev === next ? [next] : [prev, next];
}

/** Everyone, sorted for the sign-in name picker. */
export function getRosterSorted(): Member[] {
  return [...roster].sort((a, b) => a.displayName.localeCompare(b.displayName));
}
