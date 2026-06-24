"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { WheelMember } from "@/lib/realtime/useTeamWheel";

interface WheelProps {
  members: WheelMember[];
  color: string;
  litCount: number;
  total: number;
  complete: boolean;
}

const SIZE = 400;
const C = SIZE / 2;
const R = 150;

function firstName(name: string) {
  return name.split(" ")[0];
}

export function Wheel({ members, color, litCount, total, complete }: WheelProps) {
  const n = members.length || 1;
  const pos = members.map((_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: C + Math.cos(a) * R, y: C + Math.sin(a) * R, a };
  });

  return (
    <div className="relative mx-auto aspect-square w-[min(380px,86vw)]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full overflow-visible">
        {/* base ring */}
        <circle cx={C} cy={C} r={R} fill="none" stroke="var(--color-line)" strokeWidth={2} />

        {/* connecting arcs (gold where both ends are lit) */}
        {members.map((m, i) => {
          const next = members[(i + 1) % n];
          const p = pos[i];
          const q = pos[(i + 1) % n];
          const bothLit = m.lit && next.lit;
          return (
            <line
              key={`arc-${m.id}`}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              stroke={bothLit ? color : "var(--color-line)"}
              strokeWidth={bothLit ? 3 : 2}
              style={{ transition: "stroke 0.5s, stroke-width 0.5s" }}
            />
          );
        })}

        {/* nodes */}
        {members.map((m, i) => {
          const p = pos[i];
          const labelX = C + Math.cos(p.a) * (R + 30);
          const labelY = C + Math.sin(p.a) * (R + 30);
          return (
            <g key={m.id}>
              {/* presence ring: they're in the room but not yet found */}
              {m.online && !m.lit && (
                <motion.circle
                  cx={p.x}
                  cy={p.y}
                  r={18}
                  fill="none"
                  stroke="var(--color-verve)"
                  strokeWidth={1.5}
                  initial={{ opacity: 0.15 }}
                  animate={{ opacity: [0.15, 0.5, 0.15] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}

              {/* one-shot ripple on light */}
              <AnimatePresence>
                {m.lit && (
                  <motion.circle
                    key={`ripple-${m.id}`}
                    cx={p.x}
                    cy={p.y}
                    r={14}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    initial={{ r: 14, opacity: 0.7 }}
                    animate={{ r: 46, opacity: 0 }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>

              <motion.circle
                cx={p.x}
                cy={p.y}
                animate={{
                  r: m.lit ? 14 : 11,
                  fill: m.lit ? color : "#d6deee",
                }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
                style={{
                  filter: m.lit ? `drop-shadow(0 0 8px ${color})` : "none",
                  transition: "filter 0.4s",
                }}
              />

              {/* "you" marker */}
              {m.isSelf && (
                <circle cx={p.x} cy={p.y} r={5} fill="#fff" opacity={0.9} />
              )}

              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontFamily: "var(--font-jetbrains)", fontSize: 10 }}
                fill={m.lit ? "var(--color-navy)" : "var(--color-faint)"}
              >
                {m.lit ? firstName(m.displayName) : "?"}
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
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
              className="flex flex-col items-center"
            >
              <span className="text-3xl">✨</span>
              <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gold-deep">
                wheel complete
              </span>
            </motion.div>
          ) : (
            <motion.div key="count" exit={{ opacity: 0 }} className="flex flex-col items-center">
              <div className="font-display text-5xl font-extrabold leading-none tracking-tight text-navy">
                {litCount}
                <span className="text-2xl text-faint"> / {total}</span>
              </div>
              <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-gold-deep">
                canisters lit
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* completion bloom */}
      <AnimatePresence>
        {complete && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-full"
            initial={{ opacity: 0.5, scale: 0.4 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              background: `radial-gradient(circle, ${color}33, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
