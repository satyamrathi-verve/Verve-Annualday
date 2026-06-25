"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { WheelMember } from "@/lib/realtime/useTeamWheel";

interface GodModePanelProps {
  members: WheelMember[];
  onReveal: (memberId: string) => void;
  onReset: () => void;
}

export function GodModePanel({ members, onReveal, onReset }: GodModePanelProps) {
  const [open, setOpen] = useState(false);
  const unlit = members.filter((m) => !m.lit);

  return (
    <div className="w-full rounded-2xl border border-gold/40 bg-gold-soft/30 p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="grid h-6 w-6 place-items-center rounded-md bg-gold text-navy">⚡</span>
        <span className="font-display text-sm font-semibold text-navy">Manager · God-Mode</span>
        <span className="ml-auto font-mono text-[11px] text-gold-deep">
          {open ? "hide" : `${unlit.length} unlit`}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted">
              Reveal an absent or stuck member so the chain skips a link instead of breaking.
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              {unlit.length === 0 && (
                <p className="font-mono text-[12px] text-gold-deep">Every canister is lit. 🎉</p>
              )}
              {unlit.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2"
                >
                  <span className="text-sm text-navy">{m.displayName}</span>
                  <button
                    type="button"
                    onClick={() => onReveal(m.id)}
                    className="ml-auto rounded-md bg-gold px-2.5 py-1 font-mono text-[11px] font-bold text-navy transition-colors hover:bg-gold-soft"
                  >
                    ⚡ reveal
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onReset}
              className="mt-3 font-mono text-[11px] tracking-wider text-faint hover:text-red-500"
            >
              ↻ reset wheel (demo)
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
