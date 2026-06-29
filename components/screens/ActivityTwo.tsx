"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";

/*
  Activity 2 — "Build a Dashboard". Structure only for now; the actual tasks are
  defined later (and a status panel will join the admin's activities tab then).
*/
export function ActivityTwo() {
  return (
    <div className="w-full max-w-2xl text-center">
      <p className="eyebrow">Activity 2 · build a dashboard</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl lg:text-5xl">
        Build a Dashboard.
      </h1>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard accent className="mt-7 p-8">
          <p className="text-5xl" aria-hidden>
            🛠️
          </p>
          <p className="mt-4 font-display text-xl font-bold text-navy">Brief incoming.</p>
          <p className="mt-2 text-base leading-relaxed text-muted">
            The tasks for this build are being finalised. This page is ready and waiting — the host
            will drop the brief in here when it&apos;s time.
          </p>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.26em] text-gold-deep">
            stand by
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
