"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

  // Each player gets a different random 5–8 teaser reel, shuffled, picked once
  // on mount. This screen never server-renders (it mounts only after the Landing
  // CTA), so client-side randomness is safe — no hydration mismatch. All copy is
  // config-driven: swap the list in config/event.json, nothing is hard-coded.
  const deck = useMemo(
    () => buildDeck(c.rumours, c.minCards, c.maxCards),
    [c.rumours, c.minCards, c.maxCards],
  );

  const [step, setStep] = useState(0);

  // "Or maybe not." — advance to the next teaser, or straight to sign-in after
  // the last one (no interstitial close screen).
  const advance = () => {
    if (step + 1 >= deck.length) onNext();
    else setStep((s) => s + 1);
  };

  const t = deck[step];

  return (
    <div className="flex w-full max-w-2xl flex-col lg:max-w-3xl">
      <AnimatePresence mode="wait">
        <motion.div key={step} {...fade} className="flex flex-col">
          <div className="flex items-center justify-between gap-4">
            <p className="eyebrow">{c.teaserEyebrow}</p>
            <span className="font-mono text-[11px] tracking-[0.28em] text-faint lg:text-xs">
              {pad(step + 1)} / {pad(deck.length)}
            </span>
          </div>

          {/* progress pips — one per teaser in this player's reel */}
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
            <span aria-hidden>{t.emoji}</span>
          </motion.div>

          <h1 className="mt-7 font-display text-3xl font-extrabold leading-[1.1] text-navy sm:text-4xl lg:text-[2.9rem]">
            {t.heading}
          </h1>

          <p className="mt-3 text-base text-muted lg:text-lg">{t.sub}</p>

          <div className="mt-6 border-l-2 border-gold/70 pl-4 text-[15px] leading-relaxed text-muted lg:text-base">
            {t.body.map((p, i) => (
              <p key={i} className={i > 0 ? "mt-3" : undefined}>
                {p}
              </p>
            ))}
          </div>

          <p className="mt-7 font-display text-lg font-semibold text-navy">{c.closer}</p>

          <button
            type="button"
            onClick={advance}
            className="mt-5 w-full rounded-xl border border-line bg-transparent px-5 py-4 text-sm font-medium text-muted transition-colors hover:border-ink hover:bg-ink hover:text-void lg:text-base"
          >
            {c.teaserCta}
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
