"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthContext";
import { getRosterSorted } from "@/lib/data/config";
import { event } from "@/lib/data/config";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.8-6.8C35.6 2.4 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.9 6.1C12.2 13.7 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 6.9l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.4z" />
      <path fill="#FBBC05" d="M10.4 28.4c-.5-1.5-.8-3.1-.8-4.9s.3-3.4.8-4.9l-7.9-6.1C.9 16.1 0 19.9 0 24s.9 7.9 2.5 11.5l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.1-5.5c-2 1.3-4.6 2.1-8.7 2.1-6.4 0-11.8-4.2-13.6-9.9l-7.9 6.1C6.4 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function SignIn({ onNext }: { onNext: () => void }) {
  const c = event.signIn;
  const { session, signInAs, signInWithGoogle, signOut } = useAuth();
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const roster = useMemo(() => getRosterSorted(), []);
  const filtered = useMemo(
    () => roster.filter((m) => m.displayName.toLowerCase().includes(query.trim().toLowerCase())),
    [roster, query],
  );

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
      onNext();
    } catch {
      setNote("Google sign-in arrives in Phase 2 — pick your name below to step in.");
    }
  };

  const handlePick = (id: string) => {
    if (signInAs(id)) onNext();
  };

  if (session) {
    return (
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <p className="eyebrow">{c.eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-navy">
          Welcome back, {session.displayName.split(" ")[0]}.
        </h1>
        <p className="mt-4 text-[15px] text-muted">You&apos;re already signed in. Onward.</p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button variant="gold" onClick={onNext}>
            Continue →
          </Button>
          <button
            type="button"
            onClick={signOut}
            className="font-mono text-[11px] tracking-wider text-faint hover:text-verve"
          >
            not you? sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center text-center">
      <p className="eyebrow">{c.eyebrow}</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
        {c.title}
      </h1>
      <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">{c.subtitle}</p>

      <button
        type="button"
        onClick={handleGoogle}
        className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-white py-3.5 font-display text-[15px] font-semibold text-ink shadow-[0_10px_24px_-16px_rgba(14,26,51,0.5)] transition-colors hover:border-verve"
      >
        <GoogleMark />
        {c.googleLabel}
      </button>
      {note && <p className="mt-3 font-mono text-[11px] leading-relaxed text-gold-deep">{note}</p>}

      <div className="my-6 flex w-full items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-faint">
          {c.pickLabel}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your name…"
        className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-verve"
      />

      <div className="mt-3 max-h-64 w-full divide-y divide-line overflow-auto rounded-xl border border-line bg-white text-left">
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center font-mono text-[12px] text-faint">no match</p>
        )}
        {filtered.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => handlePick(m.id)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-verve-soft"
          >
            <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-verve-soft font-display text-[12px] font-bold text-verve">
              {m.displayName
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)}
            </span>
            <span className="text-sm font-medium text-ink">{m.displayName}</span>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-faint">
              {m.dailyGroup}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
