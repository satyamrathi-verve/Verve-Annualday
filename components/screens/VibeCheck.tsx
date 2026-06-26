"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/clsx";
import { event } from "@/lib/data/config";
import type { Rumour } from "@/lib/data/schema";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick a random 5–8 (clamped to the list) and shuffle. Kept as a module-level
// helper so the randomness lives outside the component render (same convention
// as the shuffle used on the Guess screen).
function buildDeck(rumours: Rumour[], minCards: number, maxCards: number): Rumour[] {
  const maxN = Math.min(maxCards, rumours.length);
  const minN = Math.min(minCards, maxN);
  const count = minN + Math.floor(Math.random() * (maxN - minN + 1));
  return shuffle(rumours).slice(0, count);
}

const pad = (n: number) => String(n).padStart(2, "0");

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
};

export function VibeCheck({ onNext }: { onNext: () => void }) {
  const c = event.vibe;

  // Each player gets a different random 5–8 rumour reel, shuffled, picked once
  // on mount. This screen never server-renders (it mounts only after the Landing
  // CTA), so client-side randomness is safe — no hydration mismatch. All copy is
  // config-driven: swap the list in config/event.json, nothing is hard-coded.
  const deck = useMemo(
    () => buildDeck(c.rumours, c.minCards, c.maxCards),
    [c.rumours, c.minCards, c.maxCards],
  );

  const [step, setStep] = useState(0);
  const done = step >= deck.length;

  const advance = () => setStep((s) => s + 1);

  return (
    <div className="flex w-full max-w-2xl flex-col lg:max-w-3xl">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="close" {...fade} className="flex flex-col">
            <p className="eyebrow">{c.closeEyebrow}</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-navy sm:text-4xl lg:text-5xl">
              {c.closeTitle}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted lg:text-lg">
              {c.closeSubtitle}
            </p>
            <div className="mt-9">
              <Button variant="gold" onClick={onNext}>
                {c.cta} →
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key={step} {...fade} className="flex flex-col">
            <div className="flex items-center justify-between gap-4">
              <p className="eyebrow">{c.eyebrows[step % c.eyebrows.length]}</p>
              <span className="font-mono text-[11px] tracking-[0.28em] text-faint lg:text-xs">
                {pad(step + 1)} / {pad(deck.length)}
              </span>
            </div>

            {/* progress pips — one per rumour in this player's reel */}
            <div className="mt-4 flex gap-1.5" aria-hidden>
              {deck.map((_, i) => (
                <span
                  key={i}
                  className={clsx(
                    "h-1.5 flex-1 rounded-full transition-all duration-300",
                    i < step ? "bg-verve" : i === step ? "bg-gold" : "bg-line",
                  )}
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.35 }}
              className="surface-card mt-8 grid h-20 w-20 place-items-center rounded-2xl text-4xl lg:h-24 lg:w-24 lg:text-5xl"
            >
              <span aria-hidden>{deck[step].emoji}</span>
            </motion.div>

            <h1 className="mt-7 font-display text-3xl font-extrabold leading-[1.1] text-navy sm:text-4xl lg:text-[2.9rem]">
              {deck[step].text}
            </h1>

            <div className="mt-9 flex flex-wrap gap-3">
              {c.reactions.map((r) => (
                <motion.button
                  key={r}
                  type="button"
                  onClick={advance}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-xl border border-line bg-card px-5 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-verve-400 hover:text-verve-400 hover:shadow-[0_14px_30px_-16px_rgba(91,141,255,0.7)] lg:text-base"
                >
                  {r}
                </motion.button>
              ))}
            </div>

            <p className="mt-4 font-mono text-[11px] text-faint">{c.helper}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
