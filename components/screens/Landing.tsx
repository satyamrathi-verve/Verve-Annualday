"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { event } from "@/lib/data/config";

export function Landing({ onNext }: { onNext: () => void }) {
  const c = event.landing;

  return (
    <div className="flex w-full max-w-2xl flex-col items-center text-center">
      {/* Courier transmission motif */}
      <motion.div
        initial={{ opacity: 0, rotate: -3, y: 10 }}
        animate={{ opacity: 1, rotate: -2, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="surface-card mb-8 w-72 max-w-[85vw] rounded-2xl p-4 text-left"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">Courier drop</p>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
              TO: A trusted recruit
              <br />
              RE: {event.eventName}
            </p>
          </div>
          <div className="grid h-12 w-10 place-items-center rounded border border-dashed border-gold font-mono text-[10px] text-gold-deep">
            VRV
          </div>
        </div>
        <div className="mt-3 border-t border-line pt-2 font-mono text-[10px] tracking-wider text-faint">
          ▸ PORTAL UNLOCKED · PROCEED
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="eyebrow"
      >
        {c.eyebrow}
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.5 }}
        className="mt-3 bg-gradient-to-br from-verve to-gold bg-clip-text font-display text-5xl font-extrabold leading-[1.04] tracking-tight text-transparent sm:text-6xl"
      >
        {c.title}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted"
      >
        {c.subtitle}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42 }}
        className="mt-9"
      >
        <Button variant="gold" onClick={onNext}>
          {c.cta} →
        </Button>
      </motion.div>
    </div>
  );
}
