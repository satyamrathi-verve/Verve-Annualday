"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { VideoFrame } from "./VideoFrame";

/*
  "Transmission" bridge between activities — a video frame (admin-set URL, or a
  placeholder until one is added) with a CTA that advances the funnel. When
  `onNext` is omitted it's a closing screen (no CTA).
*/
export function VideoBridge({
  eyebrow,
  title,
  caption,
  ctaLabel = "Continue →",
  onNext,
  src,
}: {
  eyebrow: string;
  title: string;
  caption?: string;
  ctaLabel?: string;
  onNext?: () => void;
  src?: string;
}) {
  const [played, setPlayed] = useState(false);

  return (
    <div className="flex w-full max-w-3xl flex-col items-center text-center">
      <p className="eyebrow">{eyebrow}</p>

      <VideoFrame className="mt-5" src={src} onPlayed={() => setPlayed(true)} />

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
