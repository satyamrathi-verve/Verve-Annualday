"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from "framer-motion";

/*
  Self-destruct "char" transition for the Brief → Guess hand-off.

  A themed full-screen "TOP SECRET briefing" overlay (its OWN charred-paper look,
  NOT a snapshot of the previous page) chars away from a CORNER across the page
  via an animated mask-image, revealing the next page mounted beneath it.

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

// 8 deterministic embers along the diagonal burn path (top-right → bottom-left),
// delays spread across the burn so each lifts off as the front passes it.
const EMBERS = [
  { x: "90%", y: "8%", dx: -10, rise: 150, delay: 0.06 },
  { x: "80%", y: "18%", dx: 12, rise: 170, delay: 0.16 },
  { x: "70%", y: "28%", dx: -12, rise: 160, delay: 0.26 },
  { x: "58%", y: "40%", dx: 10, rise: 185, delay: 0.38 },
  { x: "46%", y: "52%", dx: -10, rise: 175, delay: 0.5 },
  { x: "34%", y: "64%", dx: 12, rise: 195, delay: 0.62 },
  { x: "22%", y: "76%", dx: -8, rise: 180, delay: 0.74 },
  { x: "12%", y: "88%", dx: 10, rise: 205, delay: 0.86 },
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

  // ── Corner erosion mask — one circle growing from the TOP-RIGHT corner across
  // the page to the far corner (no mask-composite → bulletproof cross-browser).
  // The sheet stays OPAQUE (#000) outside a growing TRANSPARENT hole; as p: 0→1
  // the hole sweeps the whole sheet away from that corner to nothing.
  const mask = useTransform(p, (v) => {
    const inner = (112 * v).toFixed(1);
    const outer = (132 * v).toFixed(1);
    return `radial-gradient(circle at 100% 0%, transparent ${inner}%, #000 ${outer}%)`;
  });

  // Burn-front: a thin band riding just ahead of the char hole, so the amber glow
  // shows only on the advancing diagonal edge (this is the only blurred layer).
  const edgeMask = useTransform(p, (v) => {
    const a = 112 * v;
    const b = 132 * v;
    return `radial-gradient(circle at 100% 0%, transparent ${a.toFixed(1)}%, #000 ${(a + 4).toFixed(1)}%, #000 ${b.toFixed(1)}%, transparent ${(b + 8).toFixed(1)}%)`;
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
          background: "linear-gradient(135deg, #ffd27a 0%, #e0a436 45%, #b5631a 100%)",
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
