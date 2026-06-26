"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Clue } from "@/lib/data/schema";

interface ClueCardProps {
  clues: Clue;
  /** Validate a typed name. Returns true if it matches the teammate this clue points to. */
  onGuess: (name: string) => boolean;
  /** Copy shown after a wrong guess. */
  wrongNote: string;
  /** Mono header label for the sheet. */
  title?: string;
}

function ClueRow({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 w-16 flex-none font-mono text-[10px] uppercase tracking-[0.18em] text-gold-deep">
        {label}
      </span>
      <span className="text-[14px] leading-snug text-navy">{items.join(" · ")}</span>
    </div>
  );
}

export function ClueCard({ clues, onGuess, wrongNote, title = "Decode the canister" }: ClueCardProps) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  const hasClues =
    clues.hobbies.length > 0 || clues.quirks.length > 0 || clues.funFacts.length > 0;

  const submit = () => {
    const name = value.trim();
    if (!name) return;
    const ok = onGuess(name);
    if (ok) {
      // On success the parent closes the sheet; clear for the next canister.
      setValue("");
      setWrong(false);
    } else {
      setWrong(true);
      window.setTimeout(() => setWrong(false), 600);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold-deep">{title}</p>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
          who is this?
        </span>
      </div>

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
          autoFocus
          className={`w-full rounded-xl border bg-card px-4 py-3 text-sm text-ink outline-none transition-colors ${
            wrong ? "border-red-400 focus:border-red-400" : "border-line focus:border-verve-400"
          }`}
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="flex-none rounded-xl bg-verve px-5 py-3 text-sm font-semibold text-white transition-opacity hover:bg-verve-glow disabled:opacity-40"
        >
          Guess
        </button>
      </form>

      {wrong && <p className="mt-3 font-mono text-[12px] leading-relaxed text-red-400">{wrongNote}</p>}
    </div>
  );
}
