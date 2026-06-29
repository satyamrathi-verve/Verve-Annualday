"use client";

import { useState } from "react";
import { useAppSettings } from "@/lib/data/settings";
import { setActivityOpen, setGuessOpen } from "@/lib/data/adminApi";
import { useSubmissions } from "@/lib/data/activity1";
import { getMember, getTeam } from "@/lib/data/config";
import { clsx } from "@/lib/clsx";

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
      >
        <Activity1Status />
      </ToggleCard>

      <ToggleCard
        eyebrow="Activity 2"
        title="Build a Dashboard"
        on={s.activity2Open}
        onText="Open — players can reach the (placeholder) activity."
        offText="Closed — hidden from players."
        write={(v) => setActivityOpen(2, v)}
      >
        <p className="font-mono text-[11px] text-faint">
          Structure only — tasks to be defined. Status will appear here once built.
        </p>
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
  children,
}: {
  eyebrow: string;
  title: string;
  on: boolean;
  onText: string;
  offText: string;
  write: (v: boolean) => Promise<void>;
  children?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      {children && <div className="mt-4 border-t border-line/60 pt-4">{children}</div>}
    </div>
  );
}

function Activity1Status() {
  const { submissions, ready } = useSubmissions();

  if (!ready) {
    return <p className="font-mono text-[11px] tracking-wider text-faint">loading submissions…</p>;
  }

  return (
    <div>
      <p className="font-mono text-[11px] text-muted">
        <span className="font-bold text-navy">{submissions.length}</span> profile
        {submissions.length === 1 ? "" : "s"} submitted
      </p>
      {submissions.length > 0 && (
        <div className="mt-3 flex flex-col divide-y divide-line/60">
          {submissions.map((sub) => {
            const m = getMember(sub.memberId);
            const team = m?.teamId ? getTeam(m.teamId) : undefined;
            return (
              <div key={sub.memberId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="font-display text-sm font-semibold text-navy">
                  {m?.displayName ?? sub.memberId}
                </span>
                {team && (
                  <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: team.color }}>
                    {team.name}
                  </span>
                )}
                <a
                  href={sub.vercelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto max-w-[55%] truncate font-mono text-[12px] text-verve hover:underline"
                >
                  {sub.vercelUrl}
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
