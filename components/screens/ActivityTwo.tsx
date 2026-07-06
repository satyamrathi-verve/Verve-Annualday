"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/AuthContext";
import { useAppSettings } from "@/lib/data/settings";
import { getTeams, getTeamMembers } from "@/lib/data/config";
import { teamEmoji, TEST_TEAM_ID } from "@/lib/data/teamMeta";
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
  "ALL the data already exist, so never create or alter tables, only read/write " +
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
        "You already set these up in Activity 1. Open VS Code and the Claude Code extension.",
        "Open a terminal in VS Code: top menu → Terminal → New Terminal.",
      ],
    },
    {
      title: "Make your commits count (do this once) 🪪",
      body: [
        "So the live board can credit YOUR work, tell git who you are, using your own email.",
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
        "Claude will remind you after each screen, so keep the terminal handy.",
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
      </div>

      {/* The mission — the story + how the sprint works */}
      <GlassCard className="mt-8 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-deep">
          The mission
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-body">
          Just before this, you built a whole page about yourself, so you&apos;ve already felt how
          easy it is to build something real these days. Now let&apos;s point that at something bigger.
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-body">
          The whisper was true: Verve&apos;s building its own tool, and your team builds it now. Over
          the next stretch you&apos;ll turn an empty repo into a working{" "}
          <span className="font-semibold text-navy">AR Manager</span>, screen by screen, with Claude
          Code doing the heavy lifting while you steer. The backend and all the data are already in
          place, so you spend your time entirely on the screens people will actually use.
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-body">
          We&apos;ve defined everything for you. You just have to ask Claude and he&apos;ll tell you
          exactly what&apos;s needed and how to approach it. It&apos;s that easy. So if you&apos;re ever
          in doubt, ask him as many questions as you want, and he&apos;ll explain it to you.
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-body">
          Clone your team&apos;s repo, build a screen, then commit and push. Every push climbs the
          live board below, and{" "}
          <span className="font-semibold text-navy">every teammate&apos;s commits count</span>. The
          more your team ships (and the better it works), the higher you climb.
        </p>
      </GlassCard>

      {/* What you're building — the finished tool to aim for */}
      <GlassCard className="mt-6 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-deep">
          What you&apos;re building
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-body">
          An <span className="font-semibold text-navy">AR Manager</span>, the tool that finally fits
          how Verve chases what it&apos;s owed. By the end you should have a working app, running on
          your laptop, that an AR analyst could actually sit down and use:
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          <BriefItem title="Customer Master">
            every customer, their contact + credit terms, searchable.
          </BriefItem>
          <BriefItem title="Invoices">
            all invoices with status (paid / due / overdue), sortable and filterable.
          </BriefItem>
          <BriefItem title="Overdue at a glance">
            late rows flagged red, with days-late and amount outstanding.
          </BriefItem>
          <BriefItem title="Actions">
            record a payment, add a note, print or export a statement.
          </BriefItem>
        </ul>
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-faint">
          The Supabase backend and all the data already exist, so you only build the screens on top. Aim
          for something demo-ready: real data, a clean layout, and the overdue view telling the story.
        </p>
      </GlassCard>

      {/* How you're judged */}
      <GlassCard accent className="mt-6 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-deep">
          How you&apos;re judged
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          <li className="flex gap-2 text-[15px] leading-relaxed text-body">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold" />
            <span>
              <span className="font-semibold text-navy">Utility</span>: does the tool actually solve
              a real problem, and solve it well?
            </span>
          </li>
          <li className="flex gap-2 text-[15px] leading-relaxed text-body">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold" />
            <span>
              <span className="font-semibold text-navy">Commits</span>: the number of commits, and{" "}
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
              hits Submit. Then a judge comes by to see your tool live. Until then, keep building and
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

/* One line of the "what you're building" brief: a bold feature name + what it does. */
function BriefItem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="flex gap-2 text-[14px] leading-relaxed text-body">
      <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold" />
      <span>
        <span className="font-semibold text-navy">{title}</span>: {children}
      </span>
    </li>
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
        {existing ? "Submitted. Update or wrap up anytime." : "Team lead · submit when you're done"}
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
  const { showTestTeam } = useAppSettings();
  // The test crew (Project 9) is hidden until the super admin flips it on.
  const teams = getTeams().filter((t) => showTestTeam || t.id !== TEST_TEAM_ID);

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

      {/* Per-team member bars — two teams per row */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
    return <p className="mt-3 font-mono text-[10px] text-faint">no commits yet, push to light it up</p>;
  }

  const slots = Math.max(authors.length, teamSize, 1);
  const bars = Array.from({ length: slots }, (_, i) => authors[i]?.count ?? 0);
  return <MemberBarChart bars={bars} color={color} />;
}

const BUCKET_MS = 4 * 60 * 60 * 1000; // a dot ~every 4-5 hours
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
        <p className="font-mono text-[9px] text-faint">cumulative commits over time</p>
      </div>

      {!chart ? (
        <GlassCard className="mt-2 p-6 text-center">
          <p className="font-mono text-[12px] text-faint">
            The trend line appears once teams start pushing.
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="mt-2 p-4">
          <TrendLineChart chart={chart} />
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

/* ── measured-pixel SVG charts ─────────────────────────────────────────────
   Rendered at the container's real pixel width (via ResizeObserver) so axes,
   ticks and labels stay crisp and correctly sized at any width — no viewBox
   stretching. Shared by the trend line and the per-team member bars. */

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const CARD = "#101a2e"; // --color-card — rings overlapping dots against the surface

function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/* ~`target` gridline values from 0 up to ≥max, snapped to 1/2/5·10ⁿ steps. */
function axisTicks(max: number, target = 4): number[] {
  const m = Math.max(1, Math.ceil(max));
  const rawStep = m / Math.max(1, target);
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  const step = steps.find((s) => s >= rawStep) ?? Math.ceil(rawStep / 1000) * 1000;
  const top = Math.ceil(m / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) out.push(v);
  return out;
}

/* Short time-axis label: a clock within a ~2-day span, otherwise a date. */
function fmtClock(ms: number, spanMs: number): string {
  const d = new Date(ms);
  return spanMs <= 2 * 24 * 3600 * 1000
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/* Top-4 cumulative-commit trend as a real line chart: y = commits (gridlines +
   ticks), x = time (date/clock ticks), with a hover crosshair + tooltip. */
function TrendLineChart({
  chart,
}: {
  chart: { boundaries: number[]; teamSeries: { row: TeamRow; series: number[] }[]; maxY: number };
}) {
  const { boundaries, teamSeries, maxY } = chart;
  const [ref, w] = useMeasuredWidth();
  const [hover, setHover] = useState<number | null>(null);

  const H = 300;
  const pad = { l: 48, r: 18, t: 16, b: 38 };
  const n = boundaries.length;
  const innerW = Math.max(1, w - pad.l - pad.r);
  const innerH = H - pad.t - pad.b;

  const ticks = axisTicks(maxY, 4);
  const topY = ticks[ticks.length - 1] || 1;
  const x = (i: number) => pad.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad.t + (1 - v / topY) * innerH;

  const spanMs = (boundaries[n - 1] ?? 0) - (boundaries[0] ?? 0);
  const labelCount = Math.min(5, n);
  const xLabelIdx = Array.from({ length: labelCount }, (_, k) =>
    Math.round((k / Math.max(1, labelCount - 1)) * (n - 1)),
  );

  return (
    <div ref={ref} className="relative w-full" style={{ height: H }}>
      {w > 0 && (
        <svg
          width={w}
          height={H}
          role="img"
          aria-label="Cumulative commit trend for the top four teams"
          onMouseMove={(e) => {
            if (n <= 1) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const rel = (e.clientX - rect.left - pad.l) / innerW;
            setHover(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))));
          }}
          onMouseLeave={() => setHover(null)}
        >
          {/* horizontal gridlines + y axis */}
          <g className="text-line">
            {ticks.map((t) => (
              <line
                key={t}
                x1={pad.l}
                x2={w - pad.r}
                y1={y(t)}
                y2={y(t)}
                stroke="currentColor"
                strokeWidth={1}
                opacity={t === 0 ? 1 : 0.5}
              />
            ))}
            <line x1={pad.l} x2={pad.l} y1={pad.t} y2={y(0)} stroke="currentColor" strokeWidth={1} />
          </g>
          {/* y tick labels + axis title */}
          {ticks.map((t) => (
            <text
              key={t}
              x={pad.l - 8}
              y={y(t) + 3}
              textAnchor="end"
              className="fill-faint"
              style={{ fontSize: 11, fontFamily: MONO }}
            >
              {t}
            </text>
          ))}
          <text
            transform={`translate(15 ${pad.t + innerH / 2}) rotate(-90)`}
            textAnchor="middle"
            className="fill-faint"
            style={{ fontSize: 9, letterSpacing: 1.5, fontFamily: MONO }}
          >
            COMMITS
          </text>

          {/* x ticks + time labels */}
          {xLabelIdx.map((i) => (
            <g key={i}>
              <line
                x1={x(i)}
                x2={x(i)}
                y1={y(0)}
                y2={y(0) + 5}
                className="text-line"
                stroke="currentColor"
                strokeWidth={1}
              />
              <text
                x={x(i)}
                y={y(0) + 19}
                textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                className="fill-faint"
                style={{ fontSize: 10, fontFamily: MONO }}
              >
                {fmtClock(boundaries[i], spanMs)}
              </text>
            </g>
          ))}

          {/* hover crosshair */}
          {hover != null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={pad.t}
              y2={y(0)}
              className="text-verve-400"
              stroke="currentColor"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.6}
            />
          )}

          {/* one line per team */}
          {teamSeries.map(({ row, series }) => (
            <g key={row.id}>
              <polyline
                points={series.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
                fill="none"
                stroke={row.color}
                strokeWidth={2.25}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle
                cx={x(series.length - 1)}
                cy={y(series[series.length - 1] ?? 0)}
                r={4}
                fill={row.color}
                stroke={CARD}
                strokeWidth={1.5}
              />
              {hover != null && (
                <circle
                  cx={x(hover)}
                  cy={y(series[hover] ?? 0)}
                  r={4}
                  fill={row.color}
                  stroke={CARD}
                  strokeWidth={1.5}
                />
              )}
            </g>
          ))}
        </svg>
      )}

      {/* hover tooltip */}
      {hover != null && w > 0 && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-line bg-surface/95 px-3 py-2 shadow-xl"
          style={{ left: Math.min(x(hover) + 12, w - 160), top: pad.t }}
        >
          <p className="font-mono text-[10px] text-faint">{fmtClock(boundaries[hover], spanMs)}</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {[...teamSeries]
              .sort((a, b) => (b.series[hover] ?? 0) - (a.series[hover] ?? 0))
              .map(({ row, series }) => (
                <li key={row.id} className="flex items-center gap-1.5 whitespace-nowrap">
                  <span
                    className="h-2 w-2 flex-none rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="font-mono text-[11px] text-body">{row.name}</span>
                  <span className="ml-auto pl-3 font-mono text-[11px] font-bold text-navy">
                    {series[hover] ?? 0}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* Per-teammate commits as a compact bar chart with its own y-axis (gridlines +
   ticks) and U1…Un x labels. Empty slots show a faint baseline stub. */
function MemberBarChart({ bars, color }: { bars: number[]; color: string }) {
  const [ref, w] = useMeasuredWidth();
  const H = 150;
  const pad = { l: 24, r: 6, t: 16, b: 20 };
  const innerW = Math.max(1, w - pad.l - pad.r);
  const innerH = H - pad.t - pad.b;
  const ticks = axisTicks(Math.max(1, ...bars), 3);
  const topY = ticks[ticks.length - 1] || 1;
  const y = (v: number) => pad.t + (1 - v / topY) * innerH;
  const band = innerW / Math.max(1, bars.length);
  const bw = Math.min(28, Math.max(7, band * 0.62));

  return (
    <div className="mt-3 border-t border-line/50 pt-3">
      <div ref={ref} className="w-full" style={{ height: H }}>
        {w > 0 && (
          <svg width={w} height={H} role="img" aria-label="Commits per teammate">
            {/* gridlines + y labels */}
            <g className="text-line">
              {ticks.map((t) => (
                <line
                  key={t}
                  x1={pad.l}
                  x2={w - pad.r}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="currentColor"
                  strokeWidth={1}
                  opacity={t === 0 ? 1 : 0.4}
                />
              ))}
            </g>
            {ticks.map((t) => (
              <text
                key={t}
                x={pad.l - 6}
                y={y(t) + 3}
                textAnchor="end"
                className="fill-faint"
                style={{ fontSize: 9, fontFamily: MONO }}
              >
                {t}
              </text>
            ))}
            {/* bars + labels */}
            {bars.map((c, i) => {
              const cx = pad.l + band * i + band / 2;
              const by = y(c);
              return (
                <g key={i}>
                  {c > 0 ? (
                    <rect x={cx - bw / 2} y={by} width={bw} height={y(0) - by} rx={3} fill={color}>
                      <title>{`U${i + 1}: ${c} commit${c === 1 ? "" : "s"}`}</title>
                    </rect>
                  ) : (
                    <rect
                      x={cx - bw / 2}
                      y={y(0) - 2}
                      width={bw}
                      height={2}
                      rx={1}
                      className="fill-line"
                    >
                      <title>{`U${i + 1}: 0 commits`}</title>
                    </rect>
                  )}
                  {c > 0 && (
                    <text
                      x={cx}
                      y={by - 4}
                      textAnchor="middle"
                      className="fill-navy"
                      style={{ fontSize: 10, fontWeight: 700, fontFamily: MONO }}
                    >
                      {c}
                    </text>
                  )}
                  <text
                    x={cx}
                    y={H - 6}
                    textAnchor="middle"
                    className="fill-faint"
                    style={{ fontSize: 9, fontFamily: MONO }}
                  >
                    U{i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
      <p className="mt-1 font-mono text-[9px] text-faint">
        each bar = one teammate&apos;s commits (anonymised)
      </p>
    </div>
  );
}
