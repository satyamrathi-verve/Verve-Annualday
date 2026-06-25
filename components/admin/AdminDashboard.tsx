"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/AuthContext";
import { useAllWheels } from "@/lib/realtime/useAllWheels";

export function AdminDashboard() {
  const { session, signOut } = useAuth();
  const selfId = `admin:${session?.email ?? "anon"}`;
  const { teams, backendKind } = useAllWheels(selfId);

  const litTotal = teams.reduce((s, t) => s + t.litCount, 0);
  const canisterTotal = teams.reduce((s, t) => s + t.total, 0);
  const teamsComplete = teams.filter((t) => t.complete).length;
  const onlineTotal = teams.reduce((s, t) => s + t.online, 0);

  return (
    <div className="min-h-dvh px-5 py-8 sm:px-8 lg:px-12">
      {/* header */}
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4">
        <div>
          <p className="eyebrow">Mission control · super admin</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl lg:text-5xl">
            All crews, live.
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span
            className={`font-mono text-xs tracking-widest ${
              backendKind === "supabase" ? "text-verve" : "text-faint"
            }`}
          >
            {backendKind === "supabase" ? "● LIVE" : "○ local demo"}
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="font-mono text-[11px] tracking-wider text-faint hover:text-verve"
          >
            sign out
          </button>
        </div>
      </header>

      {/* summary */}
      <div className="mx-auto mt-6 grid w-full max-w-6xl grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="canisters lit" value={`${litTotal} / ${canisterTotal}`} />
        <Stat label="teams complete" value={`${teamsComplete} / ${teams.length}`} />
        <Stat label="people in rooms" value={String(onlineTotal)} />
        <Stat
          label="overall"
          value={`${canisterTotal ? Math.round((litTotal / canisterTotal) * 100) : 0}%`}
        />
      </div>

      {/* team grid */}
      <div className="mx-auto mt-6 grid w-full max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => {
          const pct = t.total ? Math.round((t.litCount / t.total) * 100) : 0;
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
                  {t.litCount}
                  <span className="text-lg text-faint"> / {t.total}</span>
                </span>
                <span className="font-mono text-[11px] text-muted">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-verve" /> {t.online} in
                  room
                </span>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: t.color }}
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
