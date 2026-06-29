"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from "framer-motion";

/*
  Self-destruct "char" transition for the Brief → Guess hand-off.

  A themed full-screen "TOP SECRET briefing" overlay (its OWN charred-paper look,
  NOT a snapshot of the Brief DOM) chars away from the edges + centre inward via
  an animated mask-image, revealing the live wheel mounted beneath it.

  Owned by Funnel (rendered OUTSIDE the step AnimatePresence) so Brief's exit
  fade can never fade/unmount the fire. Lifecycle:
    • mounts fully opaque, instantly covering the viewport
    • onCovered() at ~140ms (still fully opaque) → Funnel advances brief→guess
      behind the cover, so that swap is invisible and can't fight the fire
    • mask erosion (one MotionValue p: 0→1) chars the sheet away, revealing the
      now-mounted wheel; amber burn-front + 8 embers play
    • onComplete() at ~1700ms → Funnel unmounts this overlay

  Mobile-first: only the mask STOPS animate (one MotionValue). The eroding layer
  is a flat fill; the readable text is a separate fading layer; blur is small and
  confined to the thin burn-front layer; embers are 8 transform/opacity spans.
  No canvas, no DOM snapshot, no full-screen SVG filter, no new deps.
*/

const DURATION_S = 1.5;
const ADVANCE_MS = 140; // advance the funnel once the overlay fully covers the screen
const UNMOUNT_MS = 1700; // tell Funnel to remove us after the burn + smoke settle

// Runtime capability check — never trap the user on a browser without mask support.
export const supportsMask =
  typeof CSS !== "undefined" &&
  (CSS.supports("mask-image", "radial-gradient(#000,#000)") ||
    CSS.supports("-webkit-mask-image", "radial-gradient(#000,#000)"));

// 8 deterministic embers — tiny transform/opacity sparks lifting off the burn fronts.
const EMBERS = [
  { x: "12%", y: "14%", dx: 14, rise: 150, delay: 0.18 },
  { x: "86%", y: "18%", dx: -16, rise: 180, delay: 0.24 },
  { x: "30%", y: "8%", dx: 10, rise: 140, delay: 0.32 },
  { x: "68%", y: "10%", dx: -12, rise: 170, delay: 0.4 },
  { x: "18%", y: "82%", dx: 18, rise: 200, delay: 0.46 },
  { x: "82%", y: "84%", dx: -14, rise: 190, delay: 0.54 },
  { x: "48%", y: "50%", dx: 8, rise: 220, delay: 0.6 },
  { x: "56%", y: "46%", dx: -10, rise: 210, delay: 0.66 },
];

export function BurnTransition({
  onCovered,
  onComplete,
}: {
  /** Fired once the overlay fully covers the screen — advance the funnel here. */
  onCovered: () => void;
  /** Fired when the burn + smoke finish — unmount the overlay here. */
  onComplete: () => void;
}) {
  const reduce = useReducedMotion();

  // 0 = intact briefing, 1 = fully charred away.
  const p = useMotionValue(0);

  // Each callback fires at most once — advancing/unmounting must never double up.
  const coveredRef = useRef(false);
  const completeRef = useRef(false);
  const cover = () => {
    if (coveredRef.current) return;
    coveredRef.current = true;
    try {
      onCovered();
    } catch {
      /* never let a handler error strand the user on the briefing */
    }
  };
  const finish = () => {
    if (completeRef.current) return;
    completeRef.current = true;
    try {
      onComplete();
    } catch {
      /* ignore */
    }
  };

  // ── Single combined erosion mask (no mask-composite → bulletproof cross-browser).
  // Four corner holes + a centre hole in ONE mask-image. Each radial keeps the
  // sheet OPAQUE (#000) outside a growing TRANSPARENT hole; as p: 0→1 every hole
  // grows past 100%, charring the sheet from edges + centre to nothing.
  const mask = useTransform(p, (v) => {
    const hole = (start: number, end: number) =>
      `transparent ${(start * v).toFixed(1)}%, #000 ${(end * v).toFixed(1)}%`;
    return [
      `radial-gradient(135% 135% at 6% 5%, ${hole(86, 116)})`,
      `radial-gradient(135% 135% at 95% 7%, ${hole(82, 112)})`,
      `radial-gradient(135% 135% at 5% 96%, ${hole(88, 118)})`,
      `radial-gradient(135% 135% at 96% 95%, ${hole(90, 120)})`,
      `radial-gradient(78% 78% at 50% 50%, ${hole(64, 96)})`,
    ].join(", ");
  });

  // Burn-front mask runs slightly AHEAD of the paper hole so the amber glow shows
  // only on the thin advancing edge (this is the only blurred layer).
  const edgeMask = useTransform(p, (v) => {
    const ring = (start: number, end: number) => {
      const a = start * v;
      const b = end * v;
      return `transparent ${a.toFixed(1)}%, #000 ${(a + 6).toFixed(1)}%, #000 ${b.toFixed(1)}%, transparent ${(b + 8).toFixed(1)}%`;
    };
    return [
      `radial-gradient(135% 135% at 6% 5%, ${ring(86, 100)})`,
      `radial-gradient(135% 135% at 95% 7%, ${ring(82, 98)})`,
      `radial-gradient(135% 135% at 5% 96%, ${ring(88, 102)})`,
      `radial-gradient(135% 135% at 96% 95%, ${ring(90, 104)})`,
      `radial-gradient(78% 78% at 50% 50%, ${ring(64, 84)})`,
    ].join(", ");
  });

  useEffect(() => {
    if (reduce) {
      // Reduced motion: no fire — advance + remove immediately.
      cover();
      finish();
      return;
    }
    const controls = animate(p, 1, { duration: DURATION_S, ease: [0.4, 0, 0.5, 1] });
    const tCover = setTimeout(cover, ADVANCE_MS);
    const tDone = setTimeout(finish, UNMOUNT_MS);
    return () => {
      controls.stop();
      clearTimeout(tCover);
      clearTimeout(tDone);
      // Belt-and-suspenders: if torn down early, make sure the funnel advanced.
      cover();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reduce) return null;

  return (
    <div className="fixed inset-0 z-[9998] overflow-hidden pointer-events-none" aria-hidden>
      {/* Eroding charred briefing sheet — flat fill so the masked repaint stays cheap. */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(140% 100% at 50% -10%, rgba(61,119,255,0.12), transparent 55%), radial-gradient(80% 60% at 90% 110%, rgba(224,164,54,0.10), transparent 60%), #08111f",
          maskImage: mask,
          WebkitMaskImage: mask,
          willChange: "mask-image",
          transform: "translateZ(0)",
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 1, 0] }}
        transition={{ duration: DURATION_S + 0.1, times: [0, 0.82, 1], ease: "linear" }}
      >
        {/* faint redaction bars + scanlines, painted on the sheet for the dossier read */}
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 3px, rgba(0,0,0,0.25) 4px)",
          }}
        />
        <div className="absolute left-6 right-6 top-[22%] h-3 rounded-sm bg-black/40" />
        <div className="absolute left-6 right-16 top-[30%] h-3 rounded-sm bg-black/40" />
        <div className="absolute left-6 right-24 top-[38%] h-3 rounded-sm bg-black/40" />
      </motion.div>

      {/* Burn FRONT — amber glow on the advancing edge only (the one blurred layer). */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, #ffd27a 0%, #e0a436 35%, #7a3a0a 70%, transparent 85%)",
          mixBlendMode: "screen",
          filter: "blur(7px)",
          maskImage: edgeMask,
          WebkitMaskImage: edgeMask,
          willChange: "mask-image",
          transform: "translateZ(0)",
        }}
        initial={{ opacity: 0.9 }}
        animate={{ opacity: [0.9, 1, 0] }}
        transition={{ duration: DURATION_S, times: [0, 0.7, 1], ease: "linear" }}
      />

      {/* Readable TOP SECRET text — SEPARATE non-masked layer, just fades (cheap). */}
      <motion.div
        className="absolute inset-0 grid place-items-center px-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: DURATION_S, times: [0, 0.08, 0.36, 0.62] }}
      >
        <div>
          <p className="eyebrow text-gold-deep">TOP SECRET // EYES ONLY</p>
          <p className="mt-3 font-mono text-[11px] tracking-[0.34em] text-faint">
            ▸ THIS BRIEFING WILL SELF-DESTRUCT
          </p>
        </div>
      </motion.div>

      {/* Embers — transform/opacity only, capped at 8. */}
      {EMBERS.map((e, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-gold-400"
          style={{ left: e.x, top: e.y, boxShadow: "0 0 6px 1px #e8b04b" }}
          initial={{ opacity: 0, y: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 0], y: -e.rise, x: e.dx, scale: [0.6, 1, 0] }}
          transition={{ duration: 1.15, delay: e.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
