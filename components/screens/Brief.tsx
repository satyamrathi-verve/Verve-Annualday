"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { event } from "@/lib/data/config";

export function Brief({ onNext }: { onNext: () => void }) {
  const c = event.brief;
  // `playing` swaps the poster for the real <video>; `played` (set on end, or
  // immediately in placeholder mode) auto-reveals the "Find my crew" CTA.
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);
  const hasVideo = Boolean(c.videoSrc);
  const videoRef = useRef<HTMLVideoElement>(null);

  const onPlay = () => {
    setPlaying(true);
    // No real clip wired up yet → there's nothing to "end", so unlock right away.
    if (!hasVideo) setPlayed(true);
  };

  // Explicit fullscreen (native controls also expose one; iOS uses webkit API).
  const goFullscreen = () => {
    const v = videoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null;
    if (!v) return;
    if (v.requestFullscreen) void v.requestFullscreen();
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
  };

  return (
    <div className="flex w-full max-w-3xl flex-col items-center text-center">
      <p className="eyebrow">{c.eyebrow}</p>

      {/* Transmission frame — real <video> once played, poster placeholder before. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="surface-card relative mt-5 grid aspect-video w-full max-w-2xl place-items-center overflow-hidden rounded-2xl"
      >
        <div className="absolute left-4 top-3 z-10 flex items-center gap-2 font-mono text-[10px] tracking-[0.28em] text-gold-deep">
          <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
          REC · {c.captain.toUpperCase()}
        </div>

        {playing && hasVideo ? (
          <>
            <video
              ref={videoRef}
              src={c.videoSrc}
              autoPlay
              controls
              playsInline
              onEnded={() => setPlayed(true)}
              onError={() => setPlayed(true)}
              className="h-full w-full bg-black object-contain"
            />
            <button
              type="button"
              onClick={goFullscreen}
              className="absolute right-3 top-3 z-10 rounded-md border border-white/25 bg-black/45 px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/90 backdrop-blur transition-colors hover:bg-black/70"
              aria-label="Fullscreen"
            >
              ⛶ Fullscreen
            </button>
          </>
        ) : (
          <>
            <motion.button
              type="button"
              onClick={onPlay}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              className="group grid h-20 w-20 place-items-center rounded-full border border-verve-400 bg-verve-soft shadow-[0_0_38px_-6px_rgba(91,141,255,0.7)] lg:h-24 lg:w-24"
              aria-label="Play briefing"
            >
              <span
                className="ml-1.5 border-y-[13px] border-l-[21px] border-y-transparent border-l-verve-400 transition-colors group-hover:border-l-verve-glow"
                style={{ opacity: playing ? 0.3 : 1 }}
              />
            </motion.button>
            <p className="absolute bottom-3 font-mono text-[10px] tracking-wider text-faint">
              {playing
                ? "▸ transmission placeholder — clip drops in later"
                : c.videoLabel}
            </p>
          </>
        )}
      </motion.div>

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
