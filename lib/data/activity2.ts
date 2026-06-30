"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import activity2Config from "@/config/activity2.json";
import type { CommitStat, CommitAuthorStat, CommitPoint } from "@/app/api/commits/route";

/*
  Activity 2 ("Build the Tool That Finally Fits"). Two live data sources:

  1. Per-TEAM submissions — the team lead records the repo + a note when done.
     PUBLIC (RLS select=true) so the board shows every team; only a team's lead
     may write its row (RLS manages_team). Backed by public.activity2_submissions.

  2. The commit leaderboard — polled from /api/commits (server reads GitHub), not
     from Supabase. useCommits() refreshes it on an interval.
*/

export interface TeamSubmission {
  teamId: string;
  repoUrl: string;
  note: string | null;
  submittedBy: string | null;
  submittedAt: string;
}

export type { CommitStat, CommitAuthorStat, CommitPoint };

let channelSeq = 0;

/* ---- team repos (admin-editable, with the config slugs as a fallback) ------ */

const CONFIG_REPOS = (activity2Config as { repos?: Record<string, string> }).repos ?? {};

/** Live map of team id → repo slug/URL. Supabase rows override the config seed. */
export function useRepos(): { repos: Record<string, string>; ready: boolean } {
  const [repos, setRepos] = useState<Record<string, string>>(() => filledRepos({}));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;

    const read = async () => {
      const { data, error } = await supabase.from("activity2_repos").select("team_id,repo");
      if (!active) return;
      if (!error && data) {
        const overrides: Record<string, string> = {};
        for (const r of data as { team_id: string; repo: string | null }[]) {
          if (r.repo && r.repo.trim()) overrides[r.team_id] = r.repo.trim();
        }
        setRepos(filledRepos(overrides));
      }
      setReady(true);
    };

    void read();

    const channel = supabase
      .channel(`activity2_repos:${++channelSeq}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity2_repos" },
        () => void read(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return { repos, ready };
}

/** Config seed merged with live overrides (empty values dropped). */
function filledRepos(overrides: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [teamId, slug] of Object.entries(CONFIG_REPOS)) {
    if (slug && slug.trim()) out[teamId] = slug.trim();
  }
  for (const [teamId, slug] of Object.entries(overrides)) out[teamId] = slug;
  return out;
}

/** Admin: set (or clear) a team's repo. RLS restricts this to super admins. */
export async function setRepo(teamId: string, repo: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase isn't configured.");
  const { error } = await supabase
    .from("activity2_repos")
    .upsert({ team_id: teamId, repo, updated_at: new Date().toISOString() }, { onConflict: "team_id" });
  if (error) throw new Error(error.message);
}

interface Row {
  team_id: string;
  repo_url: string;
  note: string | null;
  submitted_by: string | null;
  submitted_at: string;
}

const toSub = (r: Row): TeamSubmission => ({
  teamId: r.team_id,
  repoUrl: r.repo_url,
  note: r.note,
  submittedBy: r.submitted_by,
  submittedAt: r.submitted_at,
});

export async function listTeamSubmissions(): Promise<TeamSubmission[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("activity2_submissions")
    .select("team_id,repo_url,note,submitted_by,submitted_at")
    .order("submitted_at", { ascending: false });
  if (error) {
    console.error("[activity2] list failed:", error.message);
    return [];
  }
  return (data ?? []).map((r) => toSub(r as Row));
}

export async function submitTeamTool(
  teamId: string,
  repoUrl: string,
  note: string,
  memberId: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase isn't configured.");
  const { error } = await supabase.from("activity2_submissions").upsert(
    {
      team_id: teamId,
      repo_url: repoUrl,
      note: note || null,
      submitted_by: memberId,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "team_id" },
  );
  if (error) throw new Error(error.message);
}

/** Live map of team submissions, refreshing as leads submit. */
export function useTeamSubmissions(): {
  submissions: TeamSubmission[];
  byTeam: Map<string, TeamSubmission>;
  ready: boolean;
} {
  const [submissions, setSubmissions] = useState<TeamSubmission[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;

    const refresh = async () => {
      const next = await listTeamSubmissions();
      if (!active) return;
      setSubmissions(next);
      setReady(true);
    };

    void refresh();

    const channel = supabase
      .channel(`activity2_submissions:${++channelSeq}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity2_submissions" },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const byTeam = new Map(submissions.map((s) => [s.teamId, s]));
  return { submissions, byTeam, ready };
}

/** Live commit stats per team, polled from the server every `pollMs`. */
export function useCommits(pollMs = 20_000): {
  byTeam: Map<string, CommitStat>;
  since: string;
  ready: boolean;
} {
  const [stats, setStats] = useState<CommitStat[]>([]);
  const [since, setSince] = useState("");
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const res = await fetch("/api/commits", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { teams: CommitStat[]; since?: string };
        if (!active) return;
        setStats(json.teams ?? []);
        if (json.since) setSince(json.since);
      } catch {
        /* transient network/route error — keep the last good numbers */
      } finally {
        if (active) setReady(true);
      }
    };

    void refresh();
    timer.current = setInterval(() => void refresh(), pollMs);

    return () => {
      active = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, [pollMs]);

  const byTeam = new Map(stats.map((s) => [s.teamId, s]));
  return { byTeam, since, ready };
}
