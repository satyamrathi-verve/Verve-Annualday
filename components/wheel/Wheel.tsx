"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { WheelMember } from "@/lib/realtime/useTeamWheel";

interface WheelProps {
  members: WheelMember[];
  /** Team accent — used for the completion bloom only; nodes use status colours. */
  color: string;
  greenCount: number;
  yellowCount: number;
  total: number;
  complete: boolean;
  /** Member ids the viewer may click to open the decode sheet (their pending share). */
  actionableIds?: Set<string>;
  onNodeClick?: (memberId: string) => void;
}

const SIZE = 400;
const C = SIZE / 2;
const R = 152;

const IDLE = "#2e3950"; // node.idle
const GREEN = "#34d17f"; // node.live
const AMBER = "#e8b04b"; // gold.400

function firstName(name: string) {
  return name.split(" ")[0];
}

export function Wheel({
  members,
  color,
  greenCount,
  yellowCount,
  total,
  complete,
  actionableIds,
  onNodeClick,
}: WheelProps) {
  const reduce = useReducedMotion();
  const n = members.length || 1;

  // Rotate the ring so "you" sit at the very top (−90°), keeping ring order
  // (and therefore adjacency / edge logic) intact.
  const selfIdx = Math.max(0, members.findIndex((m) => m.isSelf));
  const pos = members.map((_, i) => {
    const a = ((i - selfIdx) / n) * Math.PI * 2 - Math.PI / 2;
    return { x: C + Math.cos(a) * R, y: C + Math.sin(a) * R, a };
  });

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[540px]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id="wheel-amber" cx="38%" cy="34%" r="72%">
            <stop offset="0%" stopColor="#f6cd7a" />
            <stop offset="60%" stopColor={AMBER} />
            <stop offset="100%" stopColor="#b8801f" />
          </radialGradient>
          <radialGradient id="wheel-green" cx="38%" cy="34%" r="72%">
            <stop offset="0%" stopColor="#9af2c4" />
            <stop offset="55%" stopColor={GREEN} />
            <stop offset="100%" stopColor="#179a5b" />
          </radialGradient>
          <radialGradient id="wheel-idle" cx="38%" cy="34%" r="75%">
            <stop offset="0%" stopColor="#3a4763" />
            <stop offset="100%" stopColor={IDLE} />
          </radialGradient>
        </defs>

        {/* base ring */}
        <circle cx={C} cy={C} r={R} fill="none" stroke="var(--color-line)" strokeWidth={2} />

        {/* perimeter edges — fill green where both adjacent nodes are confirmed */}
        {members.map((m, i) => {
          const next = members[(i + 1) % n];
          const p = pos[i];
          const q = pos[(i + 1) % n];
          const bothGreen = m.status === "green" && next.status === "green";
          const lit = bothGreen || complete;
          return (
            <line
              key={`edge-${m.id}`}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              stroke={lit ? GREEN : "var(--color-line)"}
              strokeWidth={lit ? 3 : 2}
              style={{
                transition: "stroke 0.5s, stroke-width 0.5s",
                filter: lit ? `drop-shadow(0 0 5px ${GREEN})` : "none",
              }}
            />
          );
        })}

        {/* nodes */}
        {members.map((m, i) => {
          const p = pos[i];
          const labelX = C + Math.cos(p.a) * (R + 32);
          const labelY = C + Math.sin(p.a) * (R + 32);
          const isGreen = m.status === "green";
          const isAmber = m.status === "yellow";
          const isLit = m.status !== "grey";
          const actionable = !isLit && Boolean(actionableIds?.has(m.id)) && Boolean(onNodeClick);
          // Reveal the name once confirmed; a pending (amber) canister stays a "?"
          // so teammates who haven't guessed them aren't spoiled.
          const showName = isGreen;
          const litR = 17;
          const fillId = isGreen ? "url(#wheel-green)" : isAmber ? "url(#wheel-amber)" : "url(#wheel-idle)";
          const glow = isGreen
            ? `drop-shadow(0 0 9px ${GREEN})`
            : isAmber
              ? undefined // amber breathing handled by the .amber-pulse class
              : "none";

          return (
            <g
              key={m.id}
              onClick={actionable ? () => onNodeClick?.(m.id) : undefined}
              style={{ cursor: actionable ? "pointer" : "default" }}
            >
              {/* actionable ring — invites a click on the viewer's pending targets */}
              {actionable && (
                <motion.circle
                  cx={p.x}
                  cy={p.y}
                  r={22}
                  fill="none"
                  stroke="var(--color-verve-400)"
                  strokeWidth={1.5}
                  strokeDasharray="3 5"
                  initial={{ opacity: 0.35 }}
                  animate={reduce ? { opacity: 0.5 } : { opacity: [0.3, 0.85, 0.3], rotate: 360 }}
                  transition={{
                    opacity: { duration: 2.2, repeat: Infinity },
                    rotate: { duration: 14, repeat: Infinity, ease: "linear" },
                  }}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                />
              )}

              {/* presence ring: in the room but not yet confirmed */}
              {m.online && !isGreen && !actionable && (
                <motion.circle
                  cx={p.x}
                  cy={p.y}
                  r={19}
                  fill="none"
                  stroke="var(--color-verve)"
                  strokeWidth={1.5}
                  initial={{ opacity: 0.15 }}
                  animate={reduce ? { opacity: 0.35 } : { opacity: [0.15, 0.5, 0.15] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}

              {/* one-shot ripple when a node lights up */}
              <AnimatePresence>
                {isLit && !reduce && (
                  <motion.circle
                    key={`ripple-${m.id}-${m.status}`}
                    cx={p.x}
                    cy={p.y}
                    r={15}
                    fill="none"
                    stroke={isGreen ? GREEN : AMBER}
                    strokeWidth={2}
                    initial={{ r: 15, opacity: 0.75 }}
                    animate={{ r: 52, opacity: 0 }}
                    transition={{ duration: isGreen ? 1 : 0.85, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>

              {/* idle hairline blue ring */}
              {!isLit && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={14}
                  fill="none"
                  stroke="var(--color-verve-400)"
                  strokeWidth={1}
                  opacity={0.55}
                />
              )}

              {/* the canister body — pops on the transition to green */}
              <motion.g
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                animate={{ scale: isGreen && !reduce ? [0.9, 1.22, 1] : 1 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <motion.circle
                  cx={p.x}
                  cy={p.y}
                  className={isAmber ? "amber-pulse" : undefined}
                  initial={false}
                  animate={{ r: isLit ? litR : 13, fill: fillId }}
                  transition={{ type: "spring", stiffness: 320, damping: 18 }}
                  style={glow ? { filter: glow, transition: "filter 0.4s" } : undefined}
                />
                {/* "you" marker — small solid white dot */}
                {m.isSelf && <circle cx={p.x} cy={p.y} r={5.5} fill="#fff" opacity={0.95} />}
              </motion.g>

              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontFamily: "var(--font-jetbrains)", fontSize: 10, letterSpacing: "0.04em" }}
                fill={m.isSelf ? "#fff" : showName ? "var(--color-navy)" : "var(--color-faint)"}
              >
                {m.isSelf ? "YOU" : showName ? firstName(m.displayName) : "?"}
              </text>
            </g>
          );
        })}
      </svg>

      {/* center readout */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <AnimatePresence mode="wait">
          {complete ? (
            <motion.div
              key="done"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, y: reduce ? 0 : [0, -4, 0] }}
              transition={{
                scale: { type: "spring", stiffness: 260, damping: 16 },
                y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
              }}
              className="flex flex-col items-center"
            >
              <span className="text-4xl">✨</span>
              <span className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.3em] text-gold-deep">
                wheel complete
              </span>
            </motion.div>
          ) : (
            <motion.div key="count" exit={{ opacity: 0 }} className="flex flex-col items-center">
              <div className="font-display text-5xl font-extrabold leading-none tracking-tight text-navy">
                {greenCount}
                <span className="text-2xl text-faint"> / {total}</span>
              </div>
              <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.3em] text-gold-deep">
                confirmed
              </div>
              {yellowCount > 0 && (
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.26em] text-faint">
                  {yellowCount} pending
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* completion bloom + one-time confetti from the hub */}
      <AnimatePresence>
        {complete && (
          <motion.div
            key="bloom"
            className="pointer-events-none absolute inset-0 rounded-full"
            initial={{ opacity: 0.5, scale: 0.4 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ background: `radial-gradient(circle, ${color}33, transparent 70%)` }}
          />
        )}
      </AnimatePresence>
      {complete && !reduce && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          {Array.from({ length: 18 }).map((_, i) => {
            const ang = (i / 18) * Math.PI * 2;
            const dist = 120 + (i % 3) * 26;
            const palette = ["#34d17f", "#e8b04b", "#5b8dff"];
            return (
              <motion.span
                key={i}
                className="absolute h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: palette[i % palette.length] }}
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{
                  opacity: 0,
                  x: Math.cos(ang) * dist,
                  y: Math.sin(ang) * dist,
                  rotate: 180 + i * 12,
                  scale: 0.4,
                }}
                transition={{ duration: 1.1, ease: "easeOut", delay: 0.05 }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
