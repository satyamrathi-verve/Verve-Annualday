"use client";

import { motion } from "framer-motion";
import { event } from "@/lib/data/config";
import { useGuessOpen } from "@/lib/data/settings";

/*
  "Now We Wait." screen, shown after sign-in. When the host has OPENED the crew
  hunt, its CTA dives forward into the game (briefing + live wheel). Until then
  the CTA is locked and players are held here — it unlocks live the moment the
  super admin flips the toggle.
*/
export function Wait({ onNext, onWhispers }: { onNext: () => void; onWhispers: () => void }) {
  const c = event.wait;
  const { open, ready } = useGuessOpen();
  // Only reveal the "it's time" state once we KNOW the wheel is open — so the
  // default/closed case never flashes "the time has arrived" before locking.
  const reveal = ready && open;

  return (
    <div className="flex w-full max-w-2xl flex-col lg:max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col"
      >
        <p className="eyebrow">{reveal ? c.openEyebrow : c.eyebrow}</p>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.35 }}
          className="surface-card mt-8 grid h-20 w-20 place-items-center rounded-2xl text-4xl lg:h-24 lg:w-24 lg:text-5xl"
        >
          <span aria-hidden>{c.emoji}</span>
        </motion.div>

        <h1 className="mt-7 bg-gradient-to-br from-verve-400 to-gold bg-clip-text pb-1 font-display text-3xl font-extrabold leading-[1.05] text-transparent sm:text-4xl lg:text-5xl">
          {reveal ? c.openTitle : c.title}
        </h1>

        <p className="mt-4 font-display text-lg font-semibold text-navy">
          {reveal ? c.openSubtitle : c.subtitle}
        </p>

        <div className="mt-6 border-l-2 border-gold/70 pl-4 text-[15px] leading-relaxed text-body lg:text-base">
          {(reveal ? c.openBody : c.body).map((p, i) => (
            <p key={i} className={i > 0 ? "mt-3" : undefined}>
              {p}
            </p>
          ))}
        </div>

        {reveal ? (
          <button
            type="button"
            onClick={onNext}
            className="mt-9 w-full rounded-xl border border-line bg-transparent px-5 py-3.5 text-sm font-medium text-muted transition-colors hover:border-verve-400 hover:text-ink lg:text-base"
          >
            {c.cta}
          </button>
        ) : (
          <button
            type="button"
            onClick={onWhispers}
            className="mt-9 w-full rounded-xl border border-line bg-transparent px-5 py-3.5 text-sm font-medium text-muted transition-colors hover:border-verve-400 hover:text-ink lg:text-base"
          >
            {c.whispersCta}
          </button>
        )}
      </motion.div>
    </div>
  );
}
