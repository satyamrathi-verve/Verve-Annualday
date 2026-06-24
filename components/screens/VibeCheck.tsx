"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/clsx";
import { event } from "@/lib/data/config";

export function VibeCheck({ onNext }: { onNext: () => void }) {
  const c = event.vibe;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const allAnswered = c.questions.every((q) => answers[q.id]);

  return (
    <div className="flex w-full max-w-xl flex-col items-center text-center">
      <p className="eyebrow">{c.eyebrow}</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight text-navy sm:text-4xl">
        {c.title}
      </h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">{c.subtitle}</p>

      <div className="mt-8 flex w-full flex-col gap-7">
        {c.questions.map((q, qi) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + qi * 0.1 }}
          >
            <p className="mb-3 font-mono text-[13px] text-navy">{q.prompt}</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {q.options.map((opt) => {
                const selected = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                    className={clsx(
                      "rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                      selected
                        ? "border-gold bg-gold-soft text-gold-deep shadow-[0_8px_20px_-12px_rgba(224,164,54,0.7)]"
                        : "border-line bg-white text-ink hover:border-verve hover:text-verve",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-10">
        <Button variant="gold" onClick={onNext} disabled={!allAnswered}>
          {c.cta} →
        </Button>
        {!allAnswered && (
          <p className="mt-3 font-mono text-[11px] text-faint">tap one in each — no wrong answers</p>
        )}
      </div>
    </div>
  );
}
