import { getSupabase } from "@/lib/supabase/client";
import rosterJson from "@/config/roster.json";
import teamsJson from "@/config/teams.json";
import { clueSchema, rosterSchema, teamsSchema, type Clue, type Member } from "./schema";

/*
  Live roster/teams store.

  Teams, members and clues used to be frozen JSON constants. They now live in
  Supabase (tables `teams` + `members`) so the super-admin panel can edit team
  membership, emails/names and clues WITHOUT a redeploy. The JSON in /config is
  the one-time SEED and the offline fallback: it's validated at module load and
  used immediately (no loading flash), then `hydrateRoster()` replaces it with
  the live Supabase data before the funnel renders (see AuthContext).

  Single source of truth for membership + order is `members.teamId` +
  `members.order` — a canister's ring-neighbour guess pairing depends on that
  order (see getGuessTargets in config.ts). `teamId === null` ⇒ "unplaced".

  This is a plain module cache, not a React store: hydrateRoster() runs once,
  awaited before the first authed render, so every consumer reads fresh data.
  The admin panel re-fetches its own copy after each write; the live open/close
  toggle has its own realtime hook (see ./settings).
*/

export interface StoreTeam {
  id: string;
  name: string;
  color: string;
  /** Display + iteration order. */
  order: number;
}

/** A roster member plus its position within its team (drives guess pairing). */
export type StoreMember = Member & { order: number };

let teams: StoreTeam[] = [];
let members: StoreMember[] = [];
let memberById = new Map<string, StoreMember>();
let memberByEmail = new Map<string, StoreMember>();
let teamById = new Map<string, StoreTeam>();
let hydrated = false;

function rebuildIndexes() {
  memberById = new Map(members.map((m) => [m.id, m]));
  memberByEmail = new Map(
    members.filter((m) => m.email).map((m) => [m.email!.toLowerCase(), m]),
  );
  teamById = new Map(teams.map((t) => [t.id, t]));
}

function applyData(nextTeams: StoreTeam[], nextMembers: StoreMember[]) {
  teams = nextTeams;
  members = nextMembers;
  rebuildIndexes();
}

/* ---- seed (JSON) ------------------------------------------------------- */

function buildSeed(): { teams: StoreTeam[]; members: StoreMember[] } {
  const t = parse("teams", teamsSchema, teamsJson);
  const r = parse("roster", rosterSchema, rosterJson);

  // Per-member order = its index in the team's declared memberIds list.
  const orderById = new Map<string, number>();
  for (const team of t) team.memberIds.forEach((id, i) => orderById.set(id, i));

  const seedMembers: StoreMember[] = r.map((m) => ({
    ...m,
    order: orderById.get(m.id) ?? 0,
  }));

  // Cross-check the committed config (dev-time): every team member must exist,
  // and every explicit guessTarget must be a same-team member. Fail loudly.
  const ids = new Set(r.map((m) => m.id));
  for (const team of t) {
    for (const id of team.memberIds) {
      if (!ids.has(id)) throw new Error(`Team "${team.id}" references unknown member "${id}"`);
    }
  }
  for (const m of r) {
    for (const target of m.guessTargets ?? []) {
      const tm = r.find((x) => x.id === target);
      if (!tm) throw new Error(`Member "${m.id}" has unknown guessTarget "${target}"`);
      if (tm.teamId !== m.teamId)
        throw new Error(`Member "${m.id}" guessTarget "${target}" is on a different team`);
      if (target === m.id) throw new Error(`Member "${m.id}" cannot guess themselves`);
    }
  }

  const seedTeams: StoreTeam[] = t.map((team, i) => ({
    id: team.id,
    name: team.name,
    color: team.color,
    order: i,
  }));

  return { teams: seedTeams, members: seedMembers };
}

function parse<T>(label: string, schema: { parse: (v: unknown) => T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (err) {
    throw new Error(`Invalid config/${label}.json — ${(err as Error).message}`);
  }
}

// Seed synchronously at module load so the helpers work before hydration.
{
  const seed = buildSeed();
  applyData(seed.teams, seed.members);
}

/* ---- hydration (Supabase) --------------------------------------------- */

interface MemberRow {
  id: string;
  email: string | null;
  display_name: string;
  team_id: string | null;
  is_manager: boolean | null;
  sort_order: number | null;
  guess_targets: string[] | null;
  clues: unknown;
}

interface TeamRow {
  id: string;
  name: string;
  color: string;
  sort_order: number | null;
}

function normalizeClues(value: unknown): Clue {
  const result = clueSchema.safeParse(value);
  return result.success ? result.data : { hobbies: [], quirks: [], funFacts: [] };
}

/**
 * Replace the seed with live Supabase data. Best-effort: if Supabase isn't
 * configured, the tables don't exist yet, or anything errors, we keep the JSON
 * seed so the app still works. Safe to await more than once.
 */
export async function hydrateRoster(): Promise<void> {
  if (hydrated) return;
  hydrated = true;

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const [teamsRes, membersRes] = await Promise.all([
      supabase.from("teams").select("id,name,color,sort_order"),
      supabase
        .from("members")
        .select("id,email,display_name,team_id,is_manager,sort_order,guess_targets,clues"),
    ]);

    if (teamsRes.error || membersRes.error) return; // keep seed
    const teamRows = (teamsRes.data ?? []) as TeamRow[];
    const memberRows = (membersRes.data ?? []) as MemberRow[];
    if (teamRows.length === 0 || memberRows.length === 0) return; // not seeded yet → keep seed

    const nextTeams: StoreTeam[] = teamRows
      .map((r) => ({ id: r.id, name: r.name, color: r.color, order: r.sort_order ?? 0 }))
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

    const nextMembers: StoreMember[] = memberRows.map((r) => ({
      id: r.id,
      email: r.email ?? undefined,
      displayName: r.display_name,
      teamId: r.team_id ?? null,
      isManager: Boolean(r.is_manager),
      guessTargets:
        Array.isArray(r.guess_targets) && r.guess_targets.length > 0 ? r.guess_targets : undefined,
      clues: normalizeClues(r.clues),
      order: r.sort_order ?? 0,
    }));

    applyData(nextTeams, nextMembers);
  } catch {
    // Network / unexpected error — keep the seed.
  }
}

/* ---- accessors (read the current snapshot) ----------------------------- */

export function getTeamsSnapshot(): StoreTeam[] {
  return [...teams].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function getTeamSnapshot(id: string): StoreTeam | undefined {
  return teamById.get(id);
}

export function getMemberSnapshot(id: string): StoreMember | undefined {
  return memberById.get(id);
}

export function getMemberByEmailSnapshot(email: string): StoreMember | undefined {
  return memberByEmail.get(email.toLowerCase());
}

/** Members of a team, in declared (ring) order. */
export function getTeamMembersSnapshot(teamId: string): StoreMember[] {
  return members
    .filter((m) => m.teamId === teamId)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** Everyone, sorted by display name (used by the mock name picker). */
export function getRosterSortedSnapshot(): StoreMember[] {
  return [...members].sort((a, b) => a.displayName.localeCompare(b.displayName));
}
