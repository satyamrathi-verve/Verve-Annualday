"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { clsx } from "@/lib/clsx";
import type { Clue } from "@/lib/data/schema";

interface Candidate {
  id: string;
  displayName: string;
}

interface ClueCardProps {
  index: number;
  total: number;
  clues: Clue;
  candidates: Candidate[];
  /** Returns true if the guess was correct. */
  onGuess: (candidateId: string) => boolean;
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

export function ClueCard({ index, total, clues, candidates, onGuess }: ClueCardProps) {
  const [query, setQuery] = useState("");
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [tried, setTried] = useState<Set<string>>(new Set());

  const hasClues =
    clues.hobbies.length > 0 || clues.quirks.length > 0 || clues.funFacts.length > 0;

  const filtered = useMemo(
    () =>
      candidates.filter((c) =>
        c.displayName.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [candidates, query],
  );

  const handleTap = (id: string) => {
    const ok = onGuess(id);
    if (!ok) {
      setWrongId(id);
      setTried((t) => new Set(t).add(id));
      window.setTimeout(() => setWrongId((w) => (w === id ? null : w)), 500);
    }
  };

  return (
    <div className="w-full">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-faint">
        Clue {index} of {total} · who is this?
      </p>

      <motion.div
        animate={wrongId ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
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
              Clues coming soon — they&apos;ll show here once added. (Managers can still light this
              canister from God-Mode.)
            </p>
          )}
        </div>
      </motion.div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter colleagues…"
        className="mt-4 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-verve"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {filtered.map((c) => {
          const isWrong = wrongId === c.id;
          const wasTried = tried.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => handleTap(c.id)}
              className={clsx(
                "rounded-full border px-3.5 py-2 text-[13px] font-medium transition-all",
                isWrong
                  ? "border-red-400 bg-red-50 text-red-500"
                  : wasTried
                    ? "border-line bg-surface-2 text-faint"
                    : "border-line bg-white text-ink hover:border-verve hover:text-verve",
              )}
            >
              {c.displayName}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-1 py-2 font-mono text-[12px] text-faint">no match</p>
        )}
      </div>
    </div>
  );
}
