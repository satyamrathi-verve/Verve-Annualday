"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { event } from "@/lib/data/config";

export function Landing({ onNext }: { onNext: () => void }) {
  const c = event.landing;

  return (
    <div className="flex w-full max-w-3xl flex-col items-center text-center lg:max-w-4xl">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="eyebrow"
      >
        {c.eyebrow}
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.5 }}
        className="mt-3 bg-gradient-to-br from-verve to-gold bg-clip-text font-display text-5xl font-extrabold leading-[1.04] tracking-tight text-transparent sm:text-6xl lg:text-7xl xl:text-8xl"
      >
        {c.title}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-5 max-w-2xl font-display text-lg font-semibold leading-snug text-navy sm:text-xl lg:text-2xl"
      >
        {c.tagline}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
        className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg lg:text-xl"
      >
        {c.subtitle}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.46 }}
        className="mt-10"
      >
        <Button variant="gold" onClick={onNext}>
          {c.cta} →
        </Button>
      </motion.div>
    </div>
  );
}
