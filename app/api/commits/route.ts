import activity2 from "@/config/activity2.json";

/*
  Activity 2 live commit board. For each team's GitHub repo (admin-set in
  public.activity2_repos, falling back to config/activity2.json) this reads the
  default-branch commits since eventStartIso — SERVER-SIDE so the GitHub token
  never reaches the browser — and returns, per team:

    • count                — total commits in the window
    • authors[]            — per-MEMBER breakdown (anonymised to "User N" on the
                             client); identity = GitHub login, else commit email,
                             else commit name. Needs each player to commit under
                             their own git identity (see the Activity 2 guide).
    • commits[]            — lightweight {at, author} points for the trend line
    • lastMessage/Author/At — the most recent commit, for the ticker

  Commits are paginated (default branch only — assumes push-to-main) up to
  MAX_PAGES, and the whole payload is memoised for CACHE_MS so many players
  polling at once don't blow the GitHub rate limit. The ActivityTwo screen + admin
  board poll /api/commits every ~20s.
*/
export const dynamic = "force-dynamic";

export interface CommitAuthorStat {
  /** Stable identity key: github login || commit email || commit name (lowercased). */
  id: string;
  /** A human label for that identity (login/name/email) — anonymised in the UI. */
  name: string;
  count: number;
}

export interface CommitPoint {
  at: string;
  author: string;
}

export interface CommitStat {
  teamId: string;
  repo: string | null;
  count: number;
  lastMessage: string | null;
  lastAuthor: string | null;
  lastAt: string | null;
  authors: CommitAuthorStat[];
  commits: CommitPoint[];
  error?: string;
}

const CACHE_MS = 15_000;
// Up to 6 pages × 100 = 600 commits/team in the window — generous for an event
// slot. A team that somehow exceeds 600 shows 600.
const MAX_PAGES = 6;

let cache: { at: number; data: CommitStat[]; since: string } | null = null;

interface GitHubCommit {
  commit?: {
    message?: string;
    author?: { name?: string; email?: string; date?: string };
    committer?: { date?: string };
  };
  author?: { login?: string } | null;
}

/** owner/repo from a slug or a full github URL (drops protocol, host, .git, trailing parts). */
function toSlug(raw: string): string {
  const s = raw
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
  if (!s) return "";
  const parts = s.split("/").filter(Boolean);
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : "";
}

/** Identity + label for one commit. Prefer the linked GitHub account, then email, then name. */
function identity(c: GitHubCommit): { id: string; name: string } {
  const login = c.author?.login?.trim();
  const email = c.commit?.author?.email?.trim();
  const name = c.commit?.author?.name?.trim();
  const id = (login || email || name || "unknown").toLowerCase();
  return { id, name: login || name || email || "unknown" };
}

async function fetchRepo(
  teamId: string,
  repoRaw: string,
  since: string,
  token: string | undefined,
): Promise<CommitStat> {
  const slug = toSlug(repoRaw);
  const base: CommitStat = {
    teamId,
    repo: slug || null,
    count: 0,
    lastMessage: null,
    lastAuthor: null,
    lastAt: null,
    authors: [],
    commits: [],
  };
  if (!slug) return base;

  const counts = new Map<string, { name: string; count: number }>();
  const points: CommitPoint[] = [];
  let firstMessage: string | null = null;
  let firstAuthor: string | null = null;
  let firstAt: string | null = null;

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url =
        `https://api.github.com/repos/${slug}/commits?per_page=100&page=${page}` +
        (since ? `&since=${encodeURIComponent(since)}` : "");
      const res = await fetch(url, {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      });
      if (!res.ok) {
        // First-page failure = real error; later pages just stop with what we have.
        if (page === 1) return { ...base, error: `github ${res.status}` };
        break;
      }
      const arr = (await res.json()) as GitHubCommit[];
      if (!Array.isArray(arr) || arr.length === 0) break;
      for (const c of arr) {
        const { id, name } = identity(c);
        // Use the COMMITTER date — it matches GitHub's `since` window (which
        // filters by committer date), so the trend line's timing stays accurate
        // even for rebased/imported commits whose author date is older.
        const at = c.commit?.committer?.date ?? c.commit?.author?.date ?? null;
        if (firstMessage === null) {
          firstMessage = c.commit?.message?.split("\n")[0] ?? null;
          firstAuthor = name;
          firstAt = at;
        }
        const prev = counts.get(id);
        if (prev) prev.count += 1;
        else counts.set(id, { name, count: 1 });
        if (at) points.push({ at, author: id });
      }
      if (arr.length < 100) break;
    }
  } catch (e) {
    return { ...base, error: (e as Error).message };
  }

  const authors = [...counts.entries()]
    .map(([id, v]) => ({ id, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count);
  const count = authors.reduce((n, a) => n + a.count, 0);

  return {
    ...base,
    count,
    lastMessage: firstMessage,
    lastAuthor: firstAuthor,
    lastAt: firstAt,
    authors,
    commits: points,
  };
}

/** Team→repo, from Supabase (admin-editable) layered over the config defaults. */
async function loadRepos(): Promise<Record<string, string>> {
  const merged: Record<string, string> = {
    ...((activity2 as { repos?: Record<string, string> }).repos ?? {}),
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      const res = await fetch(`${url}/rest/v1/activity2_repos?select=team_id,repo`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      if (res.ok) {
        const rows = (await res.json()) as { team_id: string; repo: string | null }[];
        for (const r of rows) {
          if (r.repo && r.repo.trim()) merged[r.team_id] = r.repo.trim();
        }
      }
    } catch {
      /* Supabase unreachable — fall back to the config slugs. */
    }
  }
  return merged;
}

export async function GET() {
  const now = Date.now();
  const since = (activity2 as { eventStartIso?: string }).eventStartIso ?? "";

  if (cache && now - cache.at < CACHE_MS) {
    return Response.json({ teams: cache.data, since, ready: true, cached: true });
  }

  const token = process.env.GITHUB_TOKEN;
  const repos = await loadRepos();

  const data = await Promise.all(
    Object.entries(repos).map(([teamId, repo]) => fetchRepo(teamId, repo ?? "", since, token)),
  );

  cache = { at: now, data, since };
  return Response.json({ teams: data, since, ready: true });
}
