"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

/*
  Reusable "transmission" bridge between activities — a placeholder video frame
  (real clip drops in later) with a CTA that advances the funnel. Modelled on the
  briefing screen. When `onNext` is omitted it's a closing screen (no CTA).
*/
export function VideoBridge({
  eyebrow,
  title,
  caption,
  ctaLabel = "Continue →",
  onNext,
}: {
  eyebrow: string;
  title: string;
  caption?: string;
  ctaLabel?: string;
  onNext?: () => void;
}) {
  const [played, setPlayed] = useState(false);

  return (
    <div className="flex w-full max-w-3xl flex-col items-center text-center">
      <p className="eyebrow">{eyebrow}</p>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="surface-card relative mt-5 grid aspect-video w-full max-w-2xl place-items-center overflow-hidden rounded-2xl"
      >
        <div className="absolute left-4 top-3 z-10 flex items-center gap-2 font-mono text-[10px] tracking-[0.28em] text-gold-deep">
          <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
          REC · TRANSMISSION
        </div>

        <motion.button
          type="button"
          onClick={() => setPlayed(true)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          className="group grid h-20 w-20 place-items-center rounded-full border border-verve-400 bg-verve-soft shadow-[0_0_38px_-6px_rgba(91,141,255,0.7)] lg:h-24 lg:w-24"
          aria-label="Play transmission"
        >
          <span
            className="ml-1.5 border-y-[13px] border-l-[21px] border-y-transparent border-l-verve-400 transition-colors group-hover:border-l-verve-glow"
            style={{ opacity: played ? 0.3 : 1 }}
          />
        </motion.button>

        <p className="absolute bottom-3 font-mono text-[10px] tracking-wider text-faint">
          {played ? "▸ transmission placeholder — clip drops in later" : "tap to play"}
        </p>
      </motion.div>

      <h1 className="mt-7 font-display text-3xl font-extrabold leading-tight tracking-tight text-navy sm:text-4xl lg:text-5xl">
        {title}
      </h1>
      {caption && <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{caption}</p>}

      {onNext && (
        <div className="mt-9 grid min-h-[64px] place-items-center">
          <AnimatePresence mode="wait">
            {played ? (
              <motion.div
                key="cta"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <Button variant="gold" glow onClick={onNext}>
                  {ctaLabel}
                </Button>
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                exit={{ opacity: 0 }}
                className="font-mono text-[11px] tracking-[0.28em] text-faint"
              >
                ▸ PLAY TO CONTINUE
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
