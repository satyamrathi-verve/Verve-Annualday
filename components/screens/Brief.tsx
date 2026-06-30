"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { event } from "@/lib/data/config";
import { useVideos } from "@/lib/data/videos";
import { VideoFrame } from "./VideoFrame";

export function Brief({ onNext }: { onNext: () => void }) {
  const c = event.brief;
  const { videos } = useVideos();
  // Admin-set URL wins; fall back to the bundled local file (dev) if present.
  const src = videos.briefing || c.videoSrc || "";
  // `played` (set when the clip ends, or immediately if there's no video) reveals the CTA.
  const [played, setPlayed] = useState(false);

  return (
    <div className="flex w-full max-w-3xl flex-col items-center text-center">
      <p className="eyebrow">{c.eyebrow}</p>

      <VideoFrame
        className="mt-5"
        src={src}
        recLabel={c.captain.toUpperCase()}
        posterLabel={c.videoLabel}
        onPlayed={() => setPlayed(true)}
      />

      <h1 className="mt-7 font-display text-3xl font-extrabold leading-tight tracking-tight text-navy sm:text-4xl lg:text-5xl">
        {c.title}
      </h1>

      {/* CTA auto-reveals once the briefing has played. */}
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
                {c.cta} →
              </Button>
            </motion.div>
          ) : (
            <motion.p
              key="hint"
              exit={{ opacity: 0 }}
              className="font-mono text-[11px] tracking-[0.28em] text-faint"
            >
              ▸ PLAY THE BRIEFING TO PROCEED
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
