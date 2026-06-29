"use client";

import { useMemo, useState } from "react";
import { useAppSettings } from "@/lib/data/settings";
import { setActivityOpen, setGuessOpen } from "@/lib/data/adminApi";
import { useSubmissions } from "@/lib/data/activity1";
import { clsx } from "@/lib/clsx";
import { ActivityStatusBoard, type MemberStatus } from "./ActivityStatusBoard";

const EMPTY_STATUS = new Map<string, MemberStatus>();

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
        <Activity1Board />
      </ToggleCard>

      <ToggleCard
        eyebrow="Activity 2"
        title="Build a Dashboard"
        on={s.activity2Open}
        onText="Open — players can reach the (placeholder) activity."
        offText="Closed — hidden from players."
        write={(v) => setActivityOpen(2, v)}
      >
        <ActivityStatusBoard
          doneByMember={EMPTY_STATUS}
          pendingNote="Structure only — tasks to be defined. Every player will light up here once Activity 2 is built."
        />
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
