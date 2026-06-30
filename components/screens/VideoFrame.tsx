"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { clsx } from "@/lib/clsx";

/*
  Shared "transmission" video frame: a 16:9 card with a REC badge and a play
  poster; on play it swaps to the real <video> (native controls + an explicit
  Fullscreen button, iOS webkit fallback, object-contain so nothing is cropped).
  Calls onPlayed when the clip ends (or on play if there's no src yet, or on
  error) so the parent can reveal its CTA. Used by the briefing + bridge screens.
*/
export function VideoFrame({
  src,
  recLabel,
  posterLabel,
  onPlayed,
  className,
}: {
  src?: string;
  recLabel: string;
  posterLabel: string;
  onPlayed: () => void;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = Boolean(src);

  const onPlay = () => {
    setPlaying(true);
    if (!hasVideo) onPlayed(); // placeholder: nothing to "end", unlock now
  };

  const goFullscreen = () => {
    const v = videoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null;
    if (!v) return;
    if (v.requestFullscreen) void v.requestFullscreen();
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={clsx(
        "surface-card relative mx-auto grid aspect-video w-full max-w-2xl place-items-center overflow-hidden rounded-2xl",
        className,
      )}
    >
      <div className="absolute left-4 top-3 z-10 flex items-center gap-2 font-mono text-[10px] tracking-[0.28em] text-gold-deep">
        <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
        REC · {recLabel}
      </div>

      {playing && hasVideo ? (
        <>
          <video
            ref={videoRef}
            src={src}
            autoPlay
            controls
            playsInline
            onEnded={onPlayed}
            onError={onPlayed}
            className="h-full w-full bg-black object-contain"
          />
          <button
            type="button"
            onClick={goFullscreen}
            aria-label="Fullscreen"
            className="absolute right-3 top-3 z-10 rounded-md border border-white/25 bg-black/45 px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/90 backdrop-blur transition-colors hover:bg-black/70"
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
            aria-label="Play"
            className="group grid h-20 w-20 place-items-center rounded-full border border-verve-400 bg-verve-soft shadow-[0_0_38px_-6px_rgba(91,141,255,0.7)] lg:h-24 lg:w-24"
          >
            <span
              className="ml-1.5 border-y-[13px] border-l-[21px] border-y-transparent border-l-verve-400 transition-colors group-hover:border-l-verve-glow"
              style={{ opacity: playing ? 0.3 : 1 }}
            />
          </motion.button>
          <p className="absolute bottom-3 font-mono text-[10px] tracking-wider text-faint">
            {playing ? "▸ transmission placeholder — clip drops in later" : posterLabel}
          </p>
        </>
      )}
    </motion.div>
  );
}
