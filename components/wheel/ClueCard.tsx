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
  /** Mono header label for the dialog. */
  title?: string;
  /** Close the dialog (the ✕ button). */
  onClose: () => void;
}

function ClueRow({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 w-16 flex-none font-mono text-[10px] uppercase tracking-[0.18em] text-gold-deep">
        {label}
      </span>
      <span className="text-[15px] leading-relaxed text-navy">{items.join(" · ")}</span>
    </div>
  );
}

export function ClueCard({
  clues,
  onGuess,
  wrongNote,
  title = "Decode the canister",
  onClose,
}: ClueCardProps) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  const single = (clues.clue ?? "").trim();
  const hasArrays =
    clues.hobbies.length > 0 || clues.quirks.length > 0 || clues.funFacts.length > 0;

  const submit = () => {
    const name = value.trim();
    if (!name) return;
    const ok = onGuess(name);
    if (ok) {
      // On success the parent closes the dialog; clear for the next canister.
      setValue("");
      setWrong(false);
    } else {
      setWrong(true);
      window.setTimeout(() => setWrong(false), 600);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="h-2 w-2 flex-none rounded-full bg-gold animate-pulse" />
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold-deep">{title}</p>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
          who is this?
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-1.5 grid h-10 w-10 flex-none place-items-center rounded-lg text-base text-faint transition-colors hover:bg-white/5 hover:text-ink"
        >
          ✕
        </button>
      </div>

      <motion.div
        animate={wrong ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
      >
        <div className="flex flex-col gap-2.5">
          {single ? (
            <p className="text-[15px] leading-relaxed text-navy">{single}</p>
          ) : hasArrays ? (
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
        className="mt-5 flex gap-3"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type their name…"
          autoComplete="off"
          autoFocus
          className={`flex-1 rounded-xl border bg-surface px-4 py-3 text-sm text-ink outline-none transition placeholder:text-faint focus:ring-1 ${
            wrong
              ? "border-red-400 focus:border-red-400 focus:ring-red-400/50"
              : "border-verve-400/30 focus:border-verve-400/60 focus:ring-verve-400/50"
          }`}
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="flex-none whitespace-nowrap rounded-xl bg-gradient-to-b from-[#F0BE55] to-[#E0A436] px-6 py-3 font-display text-sm font-semibold text-[#0e1a33] transition-opacity hover:opacity-95 disabled:opacity-40"
        >
          Guess
        </button>
      </form>

      {wrong && <p className="mt-3 font-mono text-[12px] leading-relaxed text-red-400">{wrongNote}</p>}
    </div>
  );
}
