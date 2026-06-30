"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/AuthContext";
import { getTeams, getTeamMembers } from "@/lib/data/config";
import { teamEmoji } from "@/lib/data/teamMeta";
import {
  useCommits,
  useRepos,
  useTeamSubmissions,
  submitTeamTool,
  type CommitStat,
} from "@/lib/data/activity2";
import { GlassCard } from "@/components/ui/GlassCard";

/*
  Activity 2 — "Build the Tool That Finally Fits". A per-TEAM build sprint: the
  team clones its repo, lets Claude Code read the README + build the AR Manager
  screens against a pre-seeded Supabase backend, and pushes as they go. This
  screen shows the clone/kickoff steps, a LIVE commit board — a per-member bar
  chart for every team plus a top-4 trend line — and a Submit that only the team
  LEAD sees, which records the team's repo + note and hands off to the wrap video.

  Per-member attribution needs each player to commit under their OWN git identity
  (see the "make your commits count" step), since the board groups commits by
  author. Names are anonymised to "U1…Un" on screen.
*/

const KICKOFF_PROMPT =
  "Read README.md and CLAUDE.md in this repo, then tell me in 5 lines what we're " +
  "building and the order you'll build the screens in. The Supabase backend and " +
  "ALL the data already exist — never create or alter tables, only read/write " +
  "through the existing client. First, run the app and show me the working " +
  "Customer Master screen so I can see the pattern. Then build the next screen on " +
  "the list. After each screen works, STOP and tell us exactly what to commit and push.";

interface GuideStep {
  title: string;
  body: string[];
  snippet?: string;
}

function buildGuide(repoSlug: string): GuideStep[] {
  const cloneCmd = repoSlug
    ? `git clone https://github.com/${repoSlug}.git\ncd ${repoSlug.split("/")[1] ?? "ar-manager"}`
    : "# Your host will share your team's repo link here.";
  return [
    {
      title: "Open VS Code + Claude Code",
      body: [
        "You already set these up in Activity 1 — open VS Code and the Claude Code extension.",
        "Open a terminal in VS Code: top menu → Terminal → New Terminal.",
      ],
    },
    {
      title: "Make your commits count (do this once) 🪪",
      body: [
        "So the live board can credit YOUR work, tell git who you are — use your own email.",
        "Paste these two lines into the terminal (swap in your real name + email). Everyone on the team does this on their own laptop.",
        "Without this, all of a team's commits look like one person and the per-member chart won't work.",
      ],
      snippet: 'git config --global user.name "Your Name"\ngit config --global user.email "you@verveadvisory.com"',
    },
    {
      title: "Clone your team's repo",
      body: [
        "Paste this into the terminal to download your team's project, then open that folder in VS Code (File → Open Folder).",
        "If it asks you to sign in to GitHub, follow the prompts.",
      ],
      snippet: cloneCmd,
    },
    {
      title: "Kick Claude off",
      body: [
        "Open Claude Code in that folder and paste the prompt below. It reads the brief and starts building with you, one screen at a time.",
        "Then just talk to it: “build the invoice list”, “make overdue rows red”, “add a print button”.",
      ],
      snippet: KICKOFF_PROMPT,
    },
    {
      title: "Commit & push after every screen 🔥",
      body: [
        "Every time a screen works, run these three lines. Each push lights your team up on the live board below.",
        "Claude will remind you after each screen — keep the terminal handy.",
      ],
      snippet: 'git add -A\ngit commit -m "Built <screen name>"\ngit push',
    },
  ];
}

export function ActivityTwo({ onComplete }: { onComplete?: () => void }) {
  const { session } = useAuth();
  const { repos } = useRepos();
  const repoSlug = session?.teamId ? repos[session.teamId] ?? "" : "";
  const guide = useMemo(() => buildGuide(repoSlug), [repoSlug]);

  return (
    <div className="w-full max-w-5xl">
      <div className="text-center">
        <p className="eyebrow">Activity 2 · for your whole team</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl lg:text-5xl">
          Build <span className="text-gold-deep">the tool</span> the rumour promised.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted">
          The whisper was true — Verve&apos;s building its own tool, and your team builds it now: an
          AR Manager, screen by screen, with Claude doing the heavy lifting. The backend is already
          done. Clone, build, and push — every push climbs the live board.
        </p>
      </div>

      {/* How you're judged */}
      <GlassCard accent className="mt-8 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-deep">
          How you&apos;re judged
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          <li className="flex gap-2 text-[15px] leading-relaxed text-body">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold" />
            <span>
              <span className="font-semibold text-navy">Utility</span> — does the tool actually solve
              a real problem, and solve it well?
            </span>
          </li>
          <li className="flex gap-2 text-[15px] leading-relaxed text-body">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold" />
            <span>
              <span className="font-semibold text-navy">Commits</span> — the number of commits, and{" "}
              <span className="font-semibold text-navy">every team member must have commits</span>. The
              board below tracks each member, so make sure everyone pushes.
            </span>
          </li>
        </ul>
      </GlassCard>

      {/* The guide */}
      <div className="mt-6 grid gap-4">
        {guide.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.2) }}
          >
            <GlassCard className="p-5">
              <div className="flex items-start gap-4">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-gold/15 font-display text-base font-extrabold text-gold-deep">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-bold text-navy">{step.title}</h2>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {step.body.map((line, j) => (
                      <li key={j} className="flex gap-2 text-[15px] leading-relaxed text-body">
                        <span className="mt-2 h-1 w-1 flex-none rounded-full bg-verve-400" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  {step.snippet && <CopyBlock text={step.snippet} />}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Submit (lead only) */}
      <div className="mt-8">
        {session?.isManager && session.teamId ? (
          <LeadSubmit
            teamId={session.teamId}
            memberId={session.memberId ?? ""}
            defaultRepo={repoSlug}
            onComplete={onComplete}
          />
        ) : (
          <GlassCard className="p-5 text-center">
            <p className="text-sm text-muted">
              When your team&apos;s done, your <span className="font-semibold text-navy">team lead</span>{" "}
              hits Submit. Then a judge comes by to see your tool live. Until then — keep building and
              pushing. 🔧
            </p>
          </GlassCard>
        )}
      </div>

      {/* Live leaderboard */}
      <Leaderboard ownTeamId={session?.teamId ?? null} />
    </div>
  );
}

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked — the text is still selectable */
    }
  };
  return (
    <div className="mt-3 rounded-xl border border-gold/25 bg-gold/[0.06] p-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-deep">copy</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="ml-auto rounded-md border border-gold/40 px-2.5 py-1 font-mono text-[10px] tracking-wider text-gold-deep transition-colors hover:bg-gold/10"
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <pre className="mt-2 select-all whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-body">
        {text}
      </pre>
    </div>
  );
}

function LeadSubmit({
  teamId,
  memberId,
  defaultRepo,
  onComplete,
}: {
  teamId: string;
  memberId: string;
  defaultRepo: string;
  onComplete?: () => void;
}) {
  const { byTeam } = useTeamSubmissions();
  const existing = byTeam.get(teamId);
  const [repo, setRepo] = useState(
    existing?.repoUrl ?? (defaultRepo ? `https://github.com/${defaultRepo}` : ""),
  );
  const [note, setNote] = useState(existing?.note ?? "");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  // Sync once the live value arrives after mount (don't clobber typing).
  const [touched, setTouched] = useState(false);
  const repoValue = touched ? repo : existing?.repoUrl ?? repo;
  const noteValue = touched ? note : existing?.note ?? note;

  const valid = /^https?:\/\/.+/i.test(repoValue.trim());

  const save = async () => {
    if (!valid) return;
    setState("saving");
    setErr(null);
    try {
      await submitTeamTool(teamId, repoValue.trim(), noteValue.trim(), memberId);
      onComplete?.();
    } catch (e) {
      setErr((e as Error).message);
      setState("error");
    }
  };

  return (
    <GlassCard accent className="p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-deep">
        {existing ? "Submitted — update or wrap up anytime" : "Team lead · submit when you're done"}
      </p>
      <p className="mt-2 text-sm text-muted">
        This records your team&apos;s repo for the judges and takes you to the wrap. Your team keeps the
        app running on this laptop to demo it.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="mt-3 flex flex-col gap-3"
      >
        <input
          type="url"
          inputMode="url"
          value={repoValue}
          onChange={(e) => {
            setTouched(true);
            setRepo(e.target.value);
          }}
          placeholder="https://github.com/your-org/your-team-repo"
          className="rounded-xl border border-verve-400/30 bg-surface px-4 py-3 font-mono text-sm text-ink outline-none transition placeholder:text-faint focus:border-verve-400/60 focus:ring-1 focus:ring-verve-400/40"
        />
        <input
          type="text"
          value={noteValue}
          onChange={(e) => {
            setTouched(true);
            setNote(e.target.value);
          }}
          placeholder="One line: what did you build? (optional)"
          className="rounded-xl border border-verve-400/30 bg-surface px-4 py-3 text-sm text-ink outline-none transition placeholder:text-faint focus:border-verve-400/60 focus:ring-1 focus:ring-verve-400/40"
        />
        <button
          type="submit"
          disabled={!valid || state === "saving"}
          className="self-start whitespace-nowrap rounded-xl bg-gradient-to-b from-[#F0BE55] to-[#E0A436] px-6 py-3 font-display text-sm font-semibold text-[#0e1a33] transition-opacity hover:opacity-95 disabled:opacity-40"
        >
          {state === "saving" ? "Submitting…" : existing ? "Update & wrap up →" : "Submit & wrap up →"}
        </button>
      </form>
      {state === "error" && (
        <p className="mt-2 font-mono text-[11px] text-red-400">{err ?? "couldn't submit"}</p>
      )}
    </GlassCard>
  );
}

function formatAgo(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

interface TeamRow {
  id: string;
  name: string;
  color: string;
  stat: CommitStat | undefined;
  submitted: boolean;
}

function Leaderboard({ ownTeamId }: { ownTeamId: string | null }) {
  const { byTeam: commits, since } = useCommits();
  const { byTeam: subs } = useTeamSubmissions();
  const teams = getTeams();

  const rows: TeamRow[] = teams
    .map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      stat: commits.get(t.id),
      submitted: subs.has(t.id),
    }))
    .sort((a, b) => (b.stat?.count ?? 0) - (a.stat?.count ?? 0));

  return (
    <div className="mt-12">
      <div className="text-center">
        <p className="eyebrow">Live board · every push counts</p>
        <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
          The build, in real time
        </h2>
        <p className="mt-2 text-sm text-muted">Commits since kickoff. Push to climb. 🔥</p>
      </div>

      {/* Top-4 trend line */}
      <TrendChart rows={rows} since={since} />

      {/* Per-team member bars */}
      <div className="mt-6 flex flex-col gap-3">
        {rows.map((r, i) => (
          <TeamCard key={r.id} row={r} rank={i + 1} mine={r.id === ownTeamId} />
        ))}
      </div>
    </div>
  );
}

function TeamCard({ row, rank, mine }: { row: TeamRow; rank: number; mine: boolean }) {
  const count = row.stat?.count ?? 0;
  return (
    <GlassCard accent={mine} className="p-4">
      <div className="flex items-center gap-3">
        <span className="w-6 flex-none text-center font-display text-sm font-extrabold text-faint">
          {rank}
        </span>
        <span className="text-lg leading-none" aria-hidden>
          {teamEmoji(row.id)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-display text-sm font-bold text-navy">{row.name}</span>
            {mine && (
              <span className="rounded bg-gold/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gold-deep">
                you
              </span>
            )}
            {row.submitted && (
              <span className="rounded bg-node-live/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-node-live">
                submitted ✓
              </span>
            )}
          </span>
          {row.stat?.lastMessage && (
            <span className="mt-0.5 block truncate font-mono text-[11px] text-faint">
              {row.stat.lastMessage} · {formatAgo(row.stat.lastAt)}
            </span>
          )}
        </span>
        <span className="flex-none text-right">
          <span className="font-display text-xl font-extrabold leading-none text-navy">{count}</span>
          <span className="block font-mono text-[9px] uppercase tracking-widest text-gold-deep">
            commits
          </span>
        </span>
      </div>

      <MemberBars teamId={row.id} stat={row.stat} color={row.color} />
    </GlassCard>
  );
}

/* One vertical bar per teammate (anonymised U1…Un), height ∝ that person's
   commits. Members who haven't pushed yet show as empty bars so the team's full
   lineup is visible. */
function MemberBars({
  teamId,
  stat,
  color,
}: {
  teamId: string;
  stat: CommitStat | undefined;
  color: string;
}) {
  const authors = stat?.authors ?? [];
  const teamSize = getTeamMembers(teamId).length;

  if (stat?.error) {
    return (
      <p className="mt-3 font-mono text-[10px] text-faint">repo not reachable ({stat.error})</p>
    );
  }
  if (authors.length === 0) {
    return <p className="mt-3 font-mono text-[10px] text-faint">no commits yet — push to light it up</p>;
  }

  const slots = Math.max(authors.length, teamSize, 1);
  const bars = Array.from({ length: slots }, (_, i) => authors[i]?.count ?? 0);
  const maxCount = Math.max(1, ...bars);

  return (
    <div className="mt-3 border-t border-line/50 pt-3">
      <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
        {bars.map((c, i) => {
          const h = Math.round((c / maxCount) * 100);
          return (
            <div key={i} className="flex w-7 flex-none flex-col items-center gap-1">
              <span className="font-mono text-[9px] leading-none text-faint">{c || ""}</span>
              <div className="flex h-16 w-full items-end rounded bg-white/[0.03]">
                <div
                  className="w-full rounded transition-[height] duration-500"
                  style={{
                    height: `${c ? Math.max(h, 6) : 0}%`,
                    backgroundColor: c ? color : "transparent",
                  }}
                />
              </div>
              <span className="font-mono text-[8px] leading-none text-faint">U{i + 1}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-1 font-mono text-[9px] text-faint">
        each bar = one teammate&apos;s commits (anonymised)
      </p>
    </div>
  );
}

const BUCKET_MS = 3 * 60 * 60 * 1000; // ~every 3 hours
const MAX_BUCKETS = 32;

/* Cumulative commits at each time boundary for a team, from sorted commit times. */
function cumulativeSeries(times: number[], boundaries: number[]): number[] {
  const sorted = [...times].sort((a, b) => a - b);
  const out: number[] = [];
  let idx = 0;
  for (const t of boundaries) {
    while (idx < sorted.length && sorted[idx] <= t) idx += 1;
    out.push(idx);
  }
  return out;
}

/* Top-4 teams' cumulative commit trend over time (one line per team). Bars tell
   you "who", this line tells you "the race". */
function TrendChart({ rows, since }: { rows: TeamRow[]; since: string }) {
  const top = rows.filter((r) => (r.stat?.count ?? 0) > 0).slice(0, 4);

  const chart = useMemo(() => {
    if (top.length === 0) return null;

    const allTimes: number[] = [];
    for (const r of top) {
      for (const p of r.stat?.commits ?? []) {
        const t = Date.parse(p.at);
        if (!Number.isNaN(t)) allTimes.push(t);
      }
    }
    if (allTimes.length === 0) return null;

    const sinceMs = Date.parse(since);
    const startMs = !Number.isNaN(sinceMs) ? sinceMs : Math.min(...allTimes);
    // End at the latest commit (the line's right edge); the poll refreshes this
    // every ~20s, so "now" tracks the build without an impure Date.now() in render.
    const endMs = Math.max(Math.max(...allTimes), startMs + BUCKET_MS);
    const span = Math.max(1, endMs - startMs);

    const rawBuckets = Math.ceil(span / BUCKET_MS) + 1;
    const n = Math.min(Math.max(rawBuckets, 2), MAX_BUCKETS);
    const step = span / (n - 1);
    const boundaries = Array.from({ length: n }, (_, i) => startMs + i * step);

    const teamSeries = top.map((r) => {
      const times = (r.stat?.commits ?? [])
        .map((p) => Date.parse(p.at))
        .filter((t) => !Number.isNaN(t));
      return { row: r, series: cumulativeSeries(times, boundaries) };
    });

    const maxY = Math.max(1, ...teamSeries.map((t) => t.series[t.series.length - 1] ?? 0));
    return { boundaries, teamSeries, maxY };
  }, [top, since]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-deep">
          Trend · top 4 teams
        </p>
        <p className="font-mono text-[9px] text-faint">cumulative commits, ~3h steps</p>
      </div>

      {!chart ? (
        <GlassCard className="mt-2 p-6 text-center">
          <p className="font-mono text-[12px] text-faint">
            The trend line appears once teams start pushing.
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="mt-2 p-4">
          <Sparklines chart={chart} />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {chart.teamSeries.map(({ row }) => (
              <span key={row.id} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: row.color }}
                  aria-hidden
                />
                <span className="text-lg leading-none" aria-hidden>
                  {teamEmoji(row.id)}
                </span>
                <span className="font-mono text-[11px] text-muted">
                  {row.name} · {row.stat?.count ?? 0}
                </span>
              </span>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

const VB_W = 320;
const VB_H = 120;
const PAD = { l: 8, r: 8, t: 10, b: 18 };

function Sparklines({
  chart,
}: {
  chart: {
    boundaries: number[];
    teamSeries: { row: TeamRow; series: number[] }[];
    maxY: number;
  };
}) {
  const { boundaries, teamSeries, maxY } = chart;
  const n = boundaries.length;
  const innerW = VB_W - PAD.l - PAD.r;
  const innerH = VB_H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.t + (1 - v / maxY) * innerH;

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Cumulative commit trend for the top four teams"
    >
      {/* baseline */}
      <line
        x1={PAD.l}
        y1={VB_H - PAD.b}
        x2={VB_W - PAD.r}
        y2={VB_H - PAD.b}
        stroke="currentColor"
        className="text-line"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {teamSeries.map(({ row, series }) => {
        const pts = series.map((v, i) => `${x(i)},${y(v)}`).join(" ");
        return (
          <polyline
            key={row.id}
            points={pts}
            fill="none"
            stroke={row.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {/* axis labels */}
      <text x={PAD.l} y={VB_H - 5} className="fill-faint" style={{ fontSize: 9, fontFamily: "monospace" }}>
        D0
      </text>
      <text
        x={VB_W - PAD.r}
        y={VB_H - 5}
        textAnchor="end"
        className="fill-faint"
        style={{ fontSize: 9, fontFamily: "monospace" }}
      >
        now
      </text>
      <text x={PAD.l} y={PAD.t + 2} className="fill-faint" style={{ fontSize: 9, fontFamily: "monospace" }}>
        {maxY}
      </text>
    </svg>
  );
}
