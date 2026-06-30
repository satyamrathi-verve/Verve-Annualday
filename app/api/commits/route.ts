import activity2 from "@/config/activity2.json";

/*
  Activity 2 live commit leaderboard. Reads each team's GitHub repo (mapped in
  config/activity2.json) and returns commit count + latest commit, SERVER-SIDE so
  the GitHub token never reaches the browser. The ActivityTwo screen + admin board
  poll this every ~20s. Results are briefly memoised so many players polling at
  once don't blow the GitHub rate limit.

  Note: counts the first page (up to 100 commits since eventStartIso) — plenty for
  an event slot; a team that somehow exceeds 100 commits shows 100.
*/
export const dynamic = "force-dynamic";

export interface CommitStat {
  teamId: string;
  repo: string | null;
  count: number;
  lastMessage: string | null;
  lastAuthor: string | null;
  lastAt: string | null;
  error?: string;
}

const CACHE_MS = 15_000;
let cache: { at: number; data: CommitStat[] } | null = null;

interface GitHubCommit {
  commit?: { message?: string; author?: { name?: string; date?: string } };
}

async function fetchRepo(
  teamId: string,
  repo: string,
  since: string,
  token: string | undefined,
): Promise<CommitStat> {
  const base: CommitStat = {
    teamId,
    repo,
    count: 0,
    lastMessage: null,
    lastAuthor: null,
    lastAt: null,
  };
  try {
    const url =
      `https://api.github.com/repos/${repo}/commits?per_page=100` +
      (since ? `&since=${encodeURIComponent(since)}` : "");
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) return { ...base, error: `github ${res.status}` };
    const commits = (await res.json()) as GitHubCommit[];
    const latest = commits[0];
    return {
      ...base,
      count: commits.length,
      lastMessage: latest?.commit?.message?.split("\n")[0] ?? null,
      lastAuthor: latest?.commit?.author?.name ?? null,
      lastAt: latest?.commit?.author?.date ?? null,
    };
  } catch (e) {
    return { ...base, error: (e as Error).message };
  }
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) {
    return Response.json({ teams: cache.data, ready: true, cached: true });
  }

  const token = process.env.GITHUB_TOKEN;
  const since = (activity2 as { eventStartIso?: string }).eventStartIso ?? "";
  const repos = (activity2 as { repos: Record<string, string> }).repos ?? {};

  const data = await Promise.all(
    Object.entries(repos).map(([teamId, repo]) =>
      repo && repo.trim()
        ? fetchRepo(teamId, repo.trim(), since, token)
        : Promise.resolve<CommitStat>({
            teamId,
            repo: null,
            count: 0,
            lastMessage: null,
            lastAuthor: null,
            lastAt: null,
          }),
    ),
  );

  cache = { at: now, data };
  return Response.json({ teams: data, ready: true });
}
