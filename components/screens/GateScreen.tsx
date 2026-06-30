"use client";

import { motion } from "framer-motion";
import type { TaskGate } from "@/lib/data/schema";

/*
  A date-gated "wait for <date>" screen between activities. Locked until the host
  flips the matching activity toggle (open), then it flips live to an "the wait is
  over" headline + a CTA that advances the funnel — same pattern as the Wait
  screen. Optional `children` (e.g. the profile dashboard) render below, always.
*/
export function GateScreen({
  copy,
  open,
  ready,
  onNext,
  children,
}: {
  copy: TaskGate;
  open: boolean;
  ready: boolean;
  onNext: () => void;
  children?: React.ReactNode;
}) {
  // Only reveal the "it's time" state once we KNOW it's open, so the locked case
  // never flashes "the wait is over" before settling.
  const reveal = ready && open;

  return (
    <div className="flex w-full max-w-2xl flex-col lg:max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col"
      >
        <p className="eyebrow">{reveal ? copy.openEyebrow : copy.lockedEyebrow}</p>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.35 }}
          className="surface-card mt-8 grid h-20 w-20 place-items-center rounded-2xl text-4xl lg:h-24 lg:w-24 lg:text-5xl"
        >
          <span aria-hidden>{reveal ? "🎬" : "⏳"}</span>
        </motion.div>

        <h1 className="mt-7 bg-gradient-to-br from-verve-400 to-gold bg-clip-text pb-1 font-display text-3xl font-extrabold leading-[1.05] text-transparent sm:text-4xl lg:text-5xl">
          {reveal ? copy.openTitle : copy.lockedTitle}
        </h1>

        {!reveal && (
          <div className="mt-6 border-l-2 border-gold/70 pl-4 text-[15px] leading-relaxed text-body lg:text-base">
            {copy.lockedBody.map((p, i) => (
              <p key={i} className={i > 0 ? "mt-3" : undefined}>
                {p}
              </p>
            ))}
          </div>
        )}

        {reveal ? (
          <button
            type="button"
            onClick={onNext}
            className="mt-9 w-full rounded-xl bg-gradient-to-b from-[#F0BE55] to-[#E0A436] px-5 py-3.5 font-display text-sm font-semibold text-[#0e1a33] transition-opacity hover:opacity-95 lg:text-base"
          >
            {copy.cta}
          </button>
        ) : (
          <div className="mt-9 w-full rounded-xl border border-line bg-transparent px-5 py-3.5 text-center text-sm font-medium text-faint lg:text-base">
            🔒 Opens the moment the host flips it on.
          </div>
        )}
      </motion.div>

      {children && <div className="mt-12 w-full">{children}</div>}
    </div>
  );
}
