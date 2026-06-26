"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { WheelMember } from "@/lib/realtime/useTeamWheel";

interface WheelProps {
  members: WheelMember[];
  /** Team accent — used for the completion bloom only; nodes use status colours. */
  color: string;
  greenCount: number;
  yellowCount: number;
  total: number;
  complete: boolean;
}

const SIZE = 400;
const C = SIZE / 2;
const R = 150;

const GREEN = "#16a34a";
const YELLOW = "#f5b301";
const GREY = "#d6deee";

function firstName(name: string) {
  return name.split(" ")[0];
}

function nodeColor(status: WheelMember["status"]) {
  return status === "green" ? GREEN : status === "yellow" ? YELLOW : GREY;
}

export function Wheel({ members, color, greenCount, yellowCount, total, complete }: WheelProps) {
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

        {/* connecting arcs (green where both ends are confirmed) */}
        {members.map((m, i) => {
          const next = members[(i + 1) % n];
          const p = pos[i];
          const q = pos[(i + 1) % n];
          const bothGreen = m.status === "green" && next.status === "green";
          return (
            <line
              key={`arc-${m.id}`}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              stroke={bothGreen ? GREEN : "var(--color-line)"}
              strokeWidth={bothGreen ? 3 : 2}
              style={{ transition: "stroke 0.5s, stroke-width 0.5s" }}
            />
          );
        })}

        {/* nodes */}
        {members.map((m, i) => {
          const p = pos[i];
          const labelX = C + Math.cos(p.a) * (R + 30);
          const labelY = C + Math.sin(p.a) * (R + 30);
          const fill = nodeColor(m.status);
          const isLit = m.status !== "grey";
          // Reveal the name once confirmed; a pending (yellow) canister stays a "?"
          // so teammates who haven't guessed them aren't spoiled.
          const showName = m.status === "green";
          return (
            <g key={m.id}>
              {/* presence ring: in the room but not yet confirmed */}
              {m.online && m.status !== "green" && (
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

              {/* one-shot ripple when a node lights up */}
              <AnimatePresence>
                {isLit && (
                  <motion.circle
                    key={`ripple-${m.id}-${m.status}`}
                    cx={p.x}
                    cy={p.y}
                    r={14}
                    fill="none"
                    stroke={fill}
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
                animate={{ r: isLit ? 14 : 11, fill }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
                style={{
                  filter: isLit ? `drop-shadow(0 0 8px ${fill})` : "none",
                  transition: "filter 0.4s",
                }}
              />

              {/* "you" marker */}
              {m.isSelf && <circle cx={p.x} cy={p.y} r={5} fill="#fff" opacity={0.9} />}

              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontFamily: "var(--font-jetbrains)", fontSize: 10 }}
                fill={showName ? "var(--color-navy)" : "var(--color-faint)"}
              >
                {showName ? firstName(m.displayName) : "?"}
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
                {greenCount}
                <span className="text-2xl text-faint"> / {total}</span>
              </div>
              <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-gold-deep">
                canisters confirmed
              </div>
              {yellowCount > 0 && (
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
                  {yellowCount} pending
                </div>
              )}
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
            style={{ background: `radial-gradient(circle, ${color}33, transparent 70%)` }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
