"use client";

import { getSupabase } from "@/lib/supabase/client";
import { clueSchema, type Clue } from "./schema";

/*
  Super-admin writes to the roster + open/close toggle. Every call goes through
  the signed-in Supabase client, so the RLS policy (is_super_admin via JWT email)
  is what actually authorises the write — a non-admin's write is rejected by the
  database, not just hidden in the UI. Errors are surfaced to the caller.
*/

export interface AdminTeam {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface AdminMember {
  id: string;
  email: string | null;
  displayName: string;
  teamId: string | null;
  isManager: boolean;
  sortOrder: number;
  clues: Clue;
}

function normalizeClues(value: unknown): Clue {
  const r = clueSchema.safeParse(value);
  return r.success ? r.data : { hobbies: [], quirks: [], funFacts: [], clue: "" };
}

function client() {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase isn't configured.");
  return supabase;
}

export async function fetchAdminRoster(): Promise<{ teams: AdminTeam[]; members: AdminMember[] }> {
  const supabase = client();
  const [t, m] = await Promise.all([
    supabase.from("teams").select("id,name,color,sort_order").order("sort_order"),
    supabase
      .from("members")
      .select("id,email,display_name,team_id,is_manager,sort_order,clues")
      .order("sort_order"),
  ]);
  if (t.error) throw new Error(t.error.message);
  if (m.error) throw new Error(m.error.message);

  const teams: AdminTeam[] = (t.data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    color: r.color as string,
    sortOrder: (r.sort_order as number) ?? 0,
  }));
  const members: AdminMember[] = (m.data ?? []).map((r) => ({
    id: r.id as string,
    email: (r.email as string | null) ?? null,
    displayName: r.display_name as string,
    teamId: (r.team_id as string | null) ?? null,
    isManager: Boolean(r.is_manager),
    sortOrder: (r.sort_order as number) ?? 0,
    clues: normalizeClues(r.clues),
  }));
  return { teams, members };
}

export interface MemberPatch {
  email?: string | null;
  displayName?: string;
  teamId?: string | null;
  clues?: Clue;
  sortOrder?: number;
}

export async function updateMember(id: string, patch: MemberPatch): Promise<void> {
  const supabase = client();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("email" in patch) row.email = patch.email;
  if ("displayName" in patch) row.display_name = patch.displayName;
  if ("teamId" in patch) row.team_id = patch.teamId;
  if ("clues" in patch) row.clues = patch.clues;
  if ("sortOrder" in patch) row.sort_order = patch.sortOrder;
  const { error } = await supabase.from("members").update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getGuessOpen(): Promise<boolean> {
  const supabase = client();
  const { data, error } = await supabase
    .from("app_settings")
    .select("guess_page_open")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.guess_page_open);
}

export async function setGuessOpen(open: boolean): Promise<void> {
  const supabase = client();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ id: 1, guess_page_open: open, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export interface Attendee {
  id: string;
  email: string;
  displayName: string | null;
  firstSeen: string;
}

/** The sign-in log — everyone who has logged into the portal, newest first.
 *  Each row is captured on that person's FIRST sign-in (trigger on auth.users). */
export async function fetchAttendees(): Promise<Attendee[]> {
  const supabase = client();
  const { data, error } = await supabase
    .from("attendees")
    .select("id,email,display_name,first_seen")
    .order("first_seen", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    email: r.email as string,
    displayName: (r.display_name as string | null) ?? null,
    firstSeen: r.first_seen as string,
  }));
}
