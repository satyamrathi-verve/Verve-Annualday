"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { WheelMember } from "@/lib/realtime/useTeamWheel";

interface WheelProps {
  members: WheelMember[];
  /** Team accent — used for the completion bloom only; wedges use status colours. */
  color: string;
  greenCount: number;
  yellowCount: number;
  total: number;
  complete: boolean;
  /** Member ids the viewer may click to open the decode sheet (their pending share). */
  actionableIds?: Set<string>;
  onNodeClick?: (memberId: string) => void;
}

/*
  Vegas marquee wheel. Crew members are pie wedges ringed by chasing marquee
  bulbs, with a glowing hub medallion and a pointer up top. Status drives the
  wedge colour: grey → idle, yellow → "yours" (amber, awaiting their guess
  back), green → "mutual". Clicking an actionable idle wedge opens the decode
  sheet. Every animation is gated behind prefers-reduced-motion. Scales 4–~12.
*/

const VB = 420;
const C = VB / 2; // 210
const R_WEDGE = 168;
const R_BULB = 192;
const R_LABEL = 120;
const R_DISK = 200;
const R_MEDALLION = 62;

// idle pie shading (alternating), status colours, and bulb/pointer gold.
const IDLE_A = "#13203A";
const IDLE_B = "#1A2845";
const IDLE_HOVER = "#26365A";
const YOURS = "#E0A436"; // gold-500
const MUTUAL = "#34D17E"; // green-500
const BULB = "#F7D87A";

function firstName(name: string) {
  return name.split(" ")[0];
}

/** Polar → cartesian; deg measured clockwise from top (−90° = up). */
function polar(r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
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
  const [hoverId, setHoverId] = useState<string | null>(null);

  const N = members.length || 1;
  const step = 360 / N;
  const labelSize = N > 8 ? 9 : 11;
  // Rotate so "you" sit in the top wedge (under the pointer), keeping crew order.
  const selfIdx = Math.max(0, members.findIndex((m) => m.isSelf));
  const NB = Math.max(24, N * 3);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[540px]">
      <svg viewBox={`0 0 ${VB} ${VB}`} className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id="wheel-medallion" cx="50%" cy="42%" r="66%">
            <stop offset="0%" stopColor="#1A2C4C" />
            <stop offset="100%" stopColor="#0B1525" />
          </radialGradient>
        </defs>

        {/* outer disk */}
        <circle cx={C} cy={C} r={R_DISK} fill="#0A0F1C" stroke="#1E2A44" strokeWidth={2} />

        {/* marquee bulb ring — chasing via staggered negative delays */}
        {Array.from({ length: NB }).map((_, j) => {
          const b = polar(R_BULB, (j / NB) * 360);
          return (
            <circle
              key={`bulb-${j}`}
              cx={b.x}
              cy={b.y}
              r={4}
              fill={BULB}
              pointerEvents="none"
              className={reduce ? undefined : "animate-bulb"}
              style={
                reduce
                  ? { opacity: 0.55, filter: "drop-shadow(0 0 4px rgba(247,216,122,.8))" }
                  : {
                      filter: "drop-shadow(0 0 4px rgba(247,216,122,.8))",
                      animationDelay: `-${((j / NB) * 2).toFixed(3)}s`,
                    }
              }
            />
          );
        })}

        {/* wedges */}
        {members.map((m, i) => {
          const slot = (i - selfIdx + N) % N;
          const startDeg = slot * step;
          const endDeg = startDeg + step;
          const midDeg = startDeg + step / 2;
          const p0 = polar(R_WEDGE, startDeg);
          const p1 = polar(R_WEDGE, endDeg);
          const largeArc = step > 180 ? 1 : 0;
          const d = `M${C} ${C} L${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A${R_WEDGE} ${R_WEDGE} 0 ${largeArc} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`;
          const label = polar(R_LABEL, midDeg);

          const isMutual = m.status === "green";
          const isYours = m.status === "yellow";
          const isIdle = m.status === "grey";
          const actionable = isIdle && Boolean(actionableIds?.has(m.id)) && Boolean(onNodeClick);
          const hovered = actionable && hoverId === m.id;

          const fill = isMutual
            ? MUTUAL
            : isYours
              ? YOURS
              : hovered
                ? IDLE_HOVER
                : slot % 2 === 0
                  ? IDLE_A
                  : IDLE_B;

          const onColored = isYours || isMutual;
          const labelColor = onColored ? "#0A0E1A" : "#C4CDE6";
          // Reveal the name only once mutual; pending/idle stay "?" to avoid spoilers.
          const text = m.isSelf ? "YOU" : isMutual ? firstName(m.displayName) : "?";

          const glowClass = reduce
            ? undefined
            : isMutual
              ? "animate-glow-green"
              : isYours
                ? "animate-glow-amber"
                : undefined;
          const staticGlow = reduce
            ? isMutual
              ? "drop-shadow(0 0 7px rgba(91,230,160,.7))"
              : isYours
                ? "drop-shadow(0 0 7px rgba(224,164,54,.7))"
                : undefined
            : undefined;

          return (
            <g key={m.id}>
              <path
                d={d}
                fill={fill}
                stroke="#0A1322"
                strokeWidth={2}
                className={glowClass}
                style={{
                  filter: staticGlow,
                  cursor: actionable ? "pointer" : "default",
                  transition: "fill .25s",
                }}
                onClick={actionable ? () => onNodeClick?.(m.id) : undefined}
                onMouseEnter={actionable ? () => setHoverId(m.id) : undefined}
                onMouseLeave={actionable ? () => setHoverId(null) : undefined}
              />

              {/* actionable invite outline — pulses to say "click to decode" */}
              {actionable && (
                <motion.path
                  d={d}
                  fill="none"
                  stroke="var(--color-verve-400)"
                  strokeWidth={2.5}
                  pointerEvents="none"
                  initial={false}
                  animate={reduce ? { strokeOpacity: 0.6 } : { strokeOpacity: [0.25, 0.9, 0.25] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                pointerEvents="none"
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: labelSize,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
                fill={labelColor}
              >
                {text}
              </text>
            </g>
          );
        })}

        {/* hub medallion */}
        <circle
          cx={C}
          cy={C}
          r={R_MEDALLION}
          fill="url(#wheel-medallion)"
          stroke="rgba(224,164,54,.6)"
          strokeWidth={2}
          className={reduce ? undefined : "animate-medallion"}
          style={reduce ? { filter: "drop-shadow(0 0 8px rgba(224,164,54,.5))" } : undefined}
        />

        {/* pointer — triangle at the very top, pointing inward */}
        <path
          d={`M${C - 13} 6 L${C + 13} 6 L${C} 34 Z`}
          fill={BULB}
          style={{ filter: "drop-shadow(0 0 6px rgba(247,216,122,.7))" }}
        />
      </svg>

      {/* centre readout, layered over the medallion */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <AnimatePresence mode="wait">
          {complete ? (
            <motion.div
              key="done"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, y: reduce ? 0 : [0, -3, 0] }}
              transition={{
                scale: { type: "spring", stiffness: 260, damping: 16 },
                y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
              }}
              className="flex w-[28%] flex-col items-center"
            >
              <span className="text-3xl">✨</span>
              <span className="mt-1 font-mono text-[8.5px] uppercase leading-tight tracking-[0.26em] text-gold-deep">
                wheel complete
              </span>
            </motion.div>
          ) : (
            <motion.div key="count" exit={{ opacity: 0 }} className="flex flex-col items-center">
              <div className="font-display text-4xl font-extrabold leading-none tracking-tight text-navy">
                {greenCount}
                <span className="text-xl text-faint"> / {total}</span>
              </div>
              <div className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.3em] text-gold-deep">
                confirmed
              </div>
              {yellowCount > 0 && (
                <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.26em] text-faint">
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
            const dist = 130 + (i % 3) * 28;
            const palette = ["#34D17E", "#E0A436", "#5B8DFF"];
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
