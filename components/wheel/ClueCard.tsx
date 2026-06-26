"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Clue } from "@/lib/data/schema";

interface ClueCardProps {
  index: number;
  total: number;
  clues: Clue;
  /** Validate a typed name. Returns true if it matches the teammate this clue points to. */
  onGuess: (name: string) => boolean;
  /** Copy shown after a wrong guess. */
  wrongNote: string;
}

function ClueRow({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 w-16 flex-none font-mono text-[10px] uppercase tracking-wider text-gold-deep">
        {label}
      </span>
      <span className="text-[14px] leading-snug text-navy">{items.join(" · ")}</span>
    </div>
  );
}

export function ClueCard({ index, total, clues, onGuess, wrongNote }: ClueCardProps) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  const hasClues =
    clues.hobbies.length > 0 || clues.quirks.length > 0 || clues.funFacts.length > 0;

  const submit = () => {
    const name = value.trim();
    if (!name) return;
    const ok = onGuess(name);
    if (ok) {
      setValue("");
      setWrong(false);
    } else {
      setWrong(true);
      window.setTimeout(() => setWrong(false), 600);
    }
  };

  return (
    <div className="w-full">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-faint">
        Clue {index} of {total} · who is this?
      </p>

      <motion.div
        animate={wrong ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="surface-card rounded-2xl p-5"
      >
        <div className="flex flex-col gap-2.5">
          {hasClues ? (
            <>
              <ClueRow label="Hobbies" items={clues.hobbies} />
              <ClueRow label="Quirk" items={clues.quirks} />
              <ClueRow label="Fun fact" items={clues.funFacts} />
            </>
          ) : (
            <p className="font-mono text-[12px] leading-relaxed text-faint">
              Clues coming soon — they&apos;ll show here once added. (Managers can still confirm this
              canister from God-Mode.)
            </p>
          )}
        </div>
      </motion.div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-4 flex gap-2"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type their name…"
          autoComplete="off"
          className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors ${
            wrong ? "border-red-400 focus:border-red-400" : "border-line focus:border-verve"
          }`}
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="flex-none rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        >
          Guess
        </button>
      </form>

      {wrong && <p className="mt-2 font-mono text-[12px] text-red-500">{wrongNote}</p>}
    </div>
  );
}
