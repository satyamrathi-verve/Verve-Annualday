"use client";

import { useMemo, useState } from "react";
import { useAppSettings } from "@/lib/data/settings";
import { setActivityOpen, setGuessOpen } from "@/lib/data/adminApi";
import { useSubmissions } from "@/lib/data/activity1";
import { useCommits, useTeamSubmissions } from "@/lib/data/activity2";
import { getTeams } from "@/lib/data/config";
import { teamEmoji } from "@/lib/data/teamMeta";
import { clsx } from "@/lib/clsx";
import { ActivityStatusBoard, type MemberStatus } from "./ActivityStatusBoard";

/*
  Super-admin "activities" control centre: an open/close toggle + a status panel
  for each activity (the crew hunt, Activity 1 = About Me, Activity 2 = TBD).
  Toggles write app_settings; players' nav + flow react live.
*/
export function ActivitiesAdmin() {
  const s = useAppSettings();
  return (
    <div className="mx-auto mt-6 flex w-full max-w-4xl flex-col gap-4">
      <ToggleCard
        eyebrow="Crew hunt"
        title="The Wheel"
        on={s.guessOpen}
        onText="Open — players can enter the wheel from the wait screen."
        offText="Closed — players are held on “Now We Wait”."
        write={(v) => setGuessOpen(v)}
      >
        <p className="font-mono text-[11px] text-faint">Live progress is on the ● live board tab.</p>
      </ToggleCard>

      <ToggleCard
        eyebrow="Activity 1"
        title="About Me · profile builder"
        on={s.activity1Open}
        onText="Open — the guide + gallery are available to players."
        offText="Closed — hidden from players."
        write={(v) => setActivityOpen(1, v)}
        collapsible
      >
        <Activity1Board />
      </ToggleCard>

      <ToggleCard
        eyebrow="Activity 2"
        title="Build the Tool That Finally Fits"
        on={s.activity2Open}
        onText="Open — players can clone, build, and watch the live commit board."
        offText="Closed — hidden from players."
        write={(v) => setActivityOpen(2, v)}
        collapsible
      >
        <Activity2Board />
      </ToggleCard>
    </div>
  );
}

function ToggleCard({
  eyebrow,
  title,
  on,
  onText,
  offText,
  write,
  collapsible = false,
  children,
}: {
  eyebrow: string;
  title: string;
  on: boolean;
  onText: string;
  offText: string;
  write: (v: boolean) => Promise<void>;
  collapsible?: boolean;
  children?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Collapsible cards start closed so the panel stays compact.
  const [open, setOpen] = useState(!collapsible);

  const flip = async () => {
    setBusy(true);
    setErr(null);
    try {
      await write(!on);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface-card rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-deep">{eyebrow}</p>
          <p className="mt-1 font-display text-xl font-bold text-navy">{title}</p>
          <p className="mt-1 font-mono text-[11px] text-muted">{on ? onText : offText}</p>
          {err && <p className="mt-1 font-mono text-[11px] text-red-400">{err}</p>}
        </div>
        <button
          type="button"
          onClick={() => void flip()}
          disabled={busy}
          aria-pressed={on}
          className={clsx(
            "relative ml-auto h-9 w-16 flex-none rounded-full transition-colors disabled:opacity-50",
            on ? "bg-node-live/80" : "bg-line",
          )}
        >
          <span
            className={clsx(
              "absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all",
              on ? "left-8" : "left-1",
            )}
          />
        </button>
      </div>
      {children &&
        (collapsible ? (
          <div className="mt-4 border-t border-line/60 pt-4">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex w-full items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold-deep"
            >
              <span className={clsx("inline-block transition-transform", open && "rotate-90")}>▸</span>
              {open ? "Hide status board" : "Show status board"}
            </button>
            {open && <div className="mt-4">{children}</div>}
          </div>
        ) : (
          <div className="mt-4 border-t border-line/60 pt-4">{children}</div>
        ))}
    </div>
  );
}

function Activity1Board() {
  const { submissions, ready } = useSubmissions();
  const doneByMember = useMemo(
    () =>
      new Map<string, MemberStatus>(
        submissions.map((s) => [s.memberId, { href: s.vercelUrl, label: "view →" }]),
      ),
    [submissions],
  );

  if (!ready) {
    return <p className="font-mono text-[11px] tracking-wider text-faint">loading submissions…</p>;
  }

  return <ActivityStatusBoard doneByMember={doneByMember} />;
}

/* Activity 2 is team-level (not per-member): one row per team with live commit
   count + whether the lead has submitted. */
function Activity2Board() {
  const { byTeam: commits, ready: cReady } = useCommits();
  const { byTeam: subs, ready: sReady } = useTeamSubmissions();
  const teams = getTeams();

  const rows = teams
    .map((t) => ({ id: t.id, name: t.name, stat: commits.get(t.id), sub: subs.get(t.id) }))
    .sort((a, b) => (b.stat?.count ?? 0) - (a.stat?.count ?? 0));

  const totalCommits = rows.reduce((n, r) => n + (r.stat?.count ?? 0), 0);
  const submitted = rows.filter((r) => r.sub).length;

  if (!cReady && !sReady) {
    return <p className="font-mono text-[11px] tracking-wider text-faint">loading the board…</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="teams submitted" value={`${submitted} / ${teams.length}`} />
        <Stat label="total commits" value={String(totalCommits)} />
        <Stat label="building" value={String(rows.filter((r) => (r.stat?.count ?? 0) > 0).length)} />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2 rounded-xl border border-line/70 bg-white/[0.02] p-3"
          >
            <span className="text-base leading-none" aria-hidden>{teamEmoji(r.id)}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate font-display text-sm font-bold text-navy">{r.name}</span>
                {r.sub && (
                  <span className="rounded bg-node-live/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-node-live">
                    submitted ✓
                  </span>
                )}
              </span>
              {r.sub?.repoUrl ? (
                <a
                  href={r.sub.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block truncate font-mono text-[11px] text-verve hover:underline"
                >
                  {r.sub.note ? `${r.sub.note} · ` : ""}{r.sub.repoUrl}
                </a>
              ) : r.stat?.lastMessage ? (
                <span className="mt-0.5 block truncate font-mono text-[11px] text-faint">
                  {r.stat.lastMessage}
                </span>
              ) : (
                <span className="mt-0.5 block font-mono text-[11px] text-faint">not started</span>
              )}
            </span>
            <span className="flex-none text-right">
              <span className="font-display text-lg font-extrabold leading-none text-navy">
                {r.stat?.count ?? 0}
              </span>
              <span className="block font-mono text-[9px] uppercase tracking-widest text-gold-deep">
                commits
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line/60 bg-white/[0.02] px-3 py-2 text-center">
      <div className="font-display text-lg font-extrabold text-navy">{value}</div>
      <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-gold-deep">
        {label}
      </div>
    </div>
  );
}
