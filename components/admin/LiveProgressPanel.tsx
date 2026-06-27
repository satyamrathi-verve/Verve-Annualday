"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/AuthContext";
import { useAllWheels } from "@/lib/realtime/useAllWheels";

/*
  Live progress panel — the game-day view: every crew's wheel at once (confirmed
  / pending canisters, who's in the room, who's done). Before the game opens this
  reads all zeros; it lights up the moment teams start playing.
*/
export function LiveProgressPanel() {
  const { session } = useAuth();
  const selfId = `admin:${session?.email ?? "anon"}`;
  const { teams, resetTeam } = useAllWheels(selfId);

  const greenTotal = teams.reduce((s, t) => s + t.greenCount, 0);
  const yellowTotal = teams.reduce((s, t) => s + t.yellowCount, 0);
  const canisterTotal = teams.reduce((s, t) => s + t.total, 0);
  const teamsComplete = teams.filter((t) => t.complete).length;
  const onlineTotal = teams.reduce((s, t) => s + t.online, 0);
  const idle = greenTotal === 0 && yellowTotal === 0 && onlineTotal === 0;

  return (
    <div className="mx-auto w-full max-w-6xl">
      {idle && (
        <p className="mb-5 rounded-xl border border-gold/30 bg-gold-soft/10 px-4 py-3 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-gold-deep">
          standing by · lights up when the game opens
        </p>
      )}

      {/* summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="confirmed" value={`${greenTotal} / ${canisterTotal}`} />
        <Stat label="pending" value={String(yellowTotal)} />
        <Stat label="teams complete" value={`${teamsComplete} / ${teams.length}`} />
        <Stat label="people in rooms" value={String(onlineTotal)} />
      </div>

      {/* team grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => {
          const pct = t.total ? Math.round((t.greenCount / t.total) * 100) : 0;
          return (
            <div key={t.teamId} className="surface-card rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="font-display text-base font-bold text-navy">{t.name}</span>
                {t.complete && (
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-gold-deep">
                    ✨ complete
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-end justify-between">
                <span className="font-display text-3xl font-extrabold leading-none text-navy">
                  {t.greenCount}
                  <span className="text-lg text-faint"> / {t.total}</span>
                </span>
                <span className="font-mono text-[11px] text-muted">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-verve" /> {t.online} in
                  room
                </span>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
                <motion.div
                  className="h-full rounded-full bg-green-600"
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-faint">
                <span>{t.yellowCount} pending</span>
                <ResetButton onConfirm={() => resetTeam(t.teamId)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Two-tap reset so a stray click can't wipe a live team mid-event. */
function ResetButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        if (armed) {
          onConfirm();
          setArmed(false);
        } else {
          setArmed(true);
          window.setTimeout(() => setArmed(false), 2500);
        }
      }}
      className={armed ? "tracking-wider text-red-500" : "tracking-wider hover:text-red-500"}
    >
      {armed ? "↻ tap again to wipe" : "↻ reset"}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card rounded-2xl px-4 py-3 text-center">
      <div className="font-display text-2xl font-extrabold text-navy">{value}</div>
      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-gold-deep">
        {label}
      </div>
    </div>
  );
}
