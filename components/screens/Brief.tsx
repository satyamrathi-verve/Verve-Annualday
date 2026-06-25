"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { event } from "@/lib/data/config";

export function Brief({ onNext }: { onNext: () => void }) {
  const c = event.brief;
  const [played, setPlayed] = useState(false);

  return (
    <div className="flex w-full max-w-3xl flex-col items-center text-center">
      <p className="eyebrow">{c.eyebrow}</p>

      {/* Video placeholder — drop in the founder/host clip here later */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="surface-card relative mt-5 grid aspect-video w-full max-w-2xl place-items-center overflow-hidden rounded-2xl"
      >
        <div className="absolute left-4 top-3 flex items-center gap-2 font-mono text-[10px] tracking-widest text-gold-deep">
          <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
          REC · {c.captain.toUpperCase()}
        </div>
        <button
          type="button"
          onClick={() => setPlayed(true)}
          className="group grid h-16 w-16 place-items-center rounded-full border border-verve bg-verve-soft transition-transform hover:scale-105"
          aria-label="Play briefing"
        >
          <span
            className="ml-1 border-y-[10px] border-l-[16px] border-y-transparent border-l-verve transition-colors group-hover:border-l-verve-glow"
            style={{ opacity: played ? 0.3 : 1 }}
          />
        </button>
        <p className="absolute bottom-3 font-mono text-[10px] tracking-wider text-faint">
          {played ? "▸ transmission placeholder — clip drops in later" : c.videoLabel}
        </p>
      </motion.div>

      <h1 className="mt-7 font-display text-3xl font-extrabold leading-tight tracking-tight text-navy sm:text-4xl lg:text-5xl">
        {c.title}
      </h1>

      <blockquote className="mt-5 max-w-2xl border-l-2 border-gold pl-4 text-left font-mono text-sm leading-relaxed text-muted lg:text-base">
        {c.quote}
      </blockquote>

      <div className="mt-9">
        <Button variant="gold" onClick={onNext}>
          {c.cta} →
        </Button>
      </div>
    </div>
  );
}
