"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/AuthContext";
import { getTeams } from "@/lib/data/config";
import { teamEmoji } from "@/lib/data/teamMeta";
import { useCommits, useTeamSubmissions, submitTeamTool } from "@/lib/data/activity2";
import { GlassCard } from "@/components/ui/GlassCard";
import activity2Config from "@/config/activity2.json";

/*
  Activity 2 — "Build the Tool That Finally Fits". A per-TEAM build sprint: the
  team clones its repo, lets Claude Code read the README + build the AR Manager
  screens against a pre-seeded Supabase backend, and pushes as they go. This
  screen shows the clone/kickoff steps, a LIVE commit leaderboard (every push
  lights a team up), and a Submit that only the team LEAD sees — which records the
  team's repo + note and hands off to the wrap video.
*/

const REPOS = (activity2Config as { repos: Record<string, string> }).repos ?? {};

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
  const repoSlug = session?.teamId ? REPOS[session.teamId] ?? "" : "";
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

      {/* The guide */}
      <div className="mt-8 grid gap-4">
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

function Leaderboard({ ownTeamId }: { ownTeamId: string | null }) {
  const { byTeam: commits } = useCommits();
  const { byTeam: subs } = useTeamSubmissions();
  const teams = getTeams();

  const rows = teams
    .map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      stat: commits.get(t.id),
      submitted: subs.has(t.id),
    }))
    .sort((a, b) => (b.stat?.count ?? 0) - (a.stat?.count ?? 0));

  const max = Math.max(1, ...rows.map((r) => r.stat?.count ?? 0));

  return (
    <div className="mt-12">
      <div className="text-center">
        <p className="eyebrow">Live board · every push counts</p>
        <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
          The build, in real time
        </h2>
        <p className="mt-2 text-sm text-muted">Commits since kickoff. Push to climb. 🔥</p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {rows.map((r, i) => {
          const count = r.stat?.count ?? 0;
          const pct = Math.round((count / max) * 100);
          const mine = r.id === ownTeamId;
          return (
            <GlassCard key={r.id} accent={mine} className="p-4">
              <div className="flex items-center gap-3">
                <span className="w-6 flex-none text-center font-display text-sm font-extrabold text-faint">
                  {i + 1}
                </span>
                <span className="text-lg leading-none" aria-hidden>
                  {teamEmoji(r.id)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-display text-sm font-bold text-navy">{r.name}</span>
                    {mine && (
                      <span className="rounded bg-gold/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gold-deep">
                        you
                      </span>
                    )}
                    {r.submitted && (
                      <span className="rounded bg-node-live/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-node-live">
                        submitted ✓
                      </span>
                    )}
                  </span>
                  {r.stat?.lastMessage && (
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-faint">
                      {r.stat.lastMessage} · {formatAgo(r.stat.lastAt)}
                    </span>
                  )}
                </span>
                <span className="flex-none text-right">
                  <span className="font-display text-xl font-extrabold leading-none text-navy">
                    {count}
                  </span>
                  <span className="block font-mono text-[9px] uppercase tracking-widest text-gold-deep">
                    commits
                  </span>
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${pct}%`, backgroundColor: r.color }}
                />
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
