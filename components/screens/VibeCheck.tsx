"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

// Pick a random count between minCards/maxCards (clamped to the list) and
// shuffle — with both set to 5 in config, that's exactly 5 random. Kept as a module-level
// helper so the randomness lives outside the component render (same convention
// as the shuffle used on the Guess screen).
function buildDeck(rumours: Rumour[], minCards: number, maxCards: number): Rumour[] {
  const maxN = Math.min(maxCards, rumours.length);
  const minN = Math.min(minCards, maxN);
  const count = minN + Math.floor(Math.random() * (maxN - minN + 1));
  return shuffle(rumours).slice(0, count);
}

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
};

export function VibeCheck({ onNext }: { onNext: () => void }) {
  const c = event.vibe;

  // Each player gets a different random teaser reel (5 cards per config), shuffled, picked once
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
    <div className="flex w-full max-w-2xl flex-col px-[2.5vw] lg:max-w-3xl">
      <AnimatePresence mode="wait">
        <motion.div key={step} {...fade} className="flex flex-col">
          <p className="eyebrow">{c.teaserEyebrow}</p>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.35 }}
            className="surface-card mt-6 grid h-20 w-20 place-items-center rounded-2xl text-4xl lg:h-24 lg:w-24 lg:text-5xl"
          >
            <span aria-hidden>{t.emoji}</span>
          </motion.div>

          <h1 className="mt-7 bg-gradient-to-br from-verve-400 to-gold bg-clip-text pb-1 font-display text-3xl font-extrabold leading-[1.1] text-transparent sm:text-4xl lg:text-[2.9rem]">
            {t.heading}
          </h1>

          <p className="mt-3 font-display text-lg font-semibold text-navy">{t.sub}</p>

          <div className="mt-6 border-l-2 border-gold/70 pl-4 text-[15px] leading-relaxed text-body lg:text-base">
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
