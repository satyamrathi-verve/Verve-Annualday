"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthContext";
import { getRosterSorted } from "@/lib/data/config";
import { event } from "@/lib/data/config";

export function SignIn({ onNext }: { onNext: () => void }) {
  const { session, mode } = useAuth();

  // Once authenticated (Google returns / email verifies), skip straight to the
  // next step (Now We Wait) — no "welcome" interstitial.
  useEffect(() => {
    if (session) onNext();
  }, [session, onNext]);

  if (session) return null;

  if (mode === "mock") return <MockPicker onNext={onNext} />;
  if (mode === "email") return <EmailSignIn />;
  return <GoogleSignIn />;
}

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

/* Real Google sign-in (Supabase Auth → Google). Redirects to Google; on return
   the session arrives and this screen flips to the "Welcome" state. */
function GoogleSignIn() {
  const c = event.signIn;
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One-time notice if we got here via the 15-min idle auto-logout.
  const [idleOut] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem("getaway.idleLogout") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!idleOut) return;
    try {
      window.sessionStorage.removeItem("getaway.idleLogout");
    } catch {
      /* sessionStorage may be unavailable */
    }
  }, [idleOut]);

  const go = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      // Browser redirects to Google here.
    } catch (e) {
      setError((e as Error).message || "Couldn't start Google sign-in.");
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full max-w-lg flex-col items-center text-center lg:max-w-xl">
      {idleOut && (
        <p className="mb-5 rounded-lg border border-line bg-surface/60 px-4 py-2 font-mono text-[11px] tracking-wider text-faint">
          Signed out after 15 minutes of inactivity. Sign back in to continue.
        </p>
      )}
      <p className="eyebrow">{c.eyebrow}</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl lg:text-5xl">
        {c.title}
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted lg:text-lg">{c.subtitle}</p>

      {c.body.length > 0 && (
        <div className="mt-5 max-w-md border-l-2 border-gold/70 pl-4 text-left text-[15px] leading-relaxed text-muted">
          {c.body.map((p, i) => (
            <p key={i} className={i > 0 ? "mt-3" : undefined}>
              {p}
            </p>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface py-4 font-display text-base font-semibold text-ink shadow-[0_10px_24px_-16px_rgba(14,26,51,0.5)] transition-colors hover:border-verve disabled:opacity-50 lg:text-lg"
      >
        <GoogleMark />
        {busy ? "Redirecting…" : c.googleLabel}
      </button>
      <p className="mt-3 font-mono text-[11px] leading-relaxed tracking-wider text-faint">
        {c.fine} · @{c.allowedDomain}
      </p>
      {error && <p className="mt-3 font-mono text-[12px] leading-relaxed text-red-500">{error}</p>}
    </div>
  );
}

/* Real Verve-email sign-in (Supabase OTP / magic link). */
function EmailSignIn() {
  const c = event.signIn;
  const { sendCode, verifyCode } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = email.trim().toLowerCase();
  const domainOk = trimmed.endsWith(`@${c.allowedDomain.toLowerCase()}`);

  const send = async () => {
    setError(null);
    if (!domainOk) {
      setError(c.domainError);
      return;
    }
    setBusy(true);
    try {
      await sendCode(trimmed);
      setStage("code");
    } catch (e) {
      setError((e as Error).message || "Couldn't send the code — try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError(null);
    setBusy(true);
    try {
      await verifyCode(trimmed, code.trim());
      // On success, onAuthStateChange flips the session and this screen
      // re-renders into the "Welcome" state with a Continue button.
    } catch (e) {
      setError((e as Error).message || "That code didn't work — check and retry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full max-w-lg flex-col items-center text-center lg:max-w-xl">
      <p className="eyebrow">{c.eyebrow}</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl lg:text-5xl">
        {c.title}
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted lg:text-lg">{c.subtitle}</p>

      {stage === "email" ? (
        <div className="mt-8 flex w-full flex-col gap-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={c.emailPlaceholder}
            className="w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-center text-base text-ink outline-none transition-colors focus:border-verve"
          />
          <Button variant="gold" onClick={send} disabled={busy || trimmed.length === 0}>
            {busy ? "Sending…" : `${c.sendLabel} →`}
          </Button>
        </div>
      ) : (
        <div className="mt-8 flex w-full flex-col gap-3">
          <p className="font-mono text-[12px] leading-relaxed text-muted">
            {c.checkEmail.replace("{email}", trimmed)}
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && code.length >= 6 && verify()}
            placeholder={c.codeLabel}
            className="w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-center font-mono text-2xl tracking-[0.4em] text-ink outline-none transition-colors focus:border-verve"
          />
          <Button variant="gold" onClick={verify} disabled={busy || code.length < 6}>
            {busy ? "Verifying…" : c.verifyLabel}
          </Button>
          <div className="mt-1 flex items-center justify-center gap-4 font-mono text-[11px] text-faint">
            <button
              type="button"
              onClick={() => {
                setStage("email");
                setCode("");
                setError(null);
              }}
              className="tracking-wider hover:text-verve"
            >
              ← different email
            </button>
            <button type="button" onClick={send} className="tracking-wider hover:text-verve">
              resend code
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 font-mono text-[12px] leading-relaxed text-red-500">{error}</p>}
    </div>
  );
}

/* Offline fallback: synthetic-roster name picker (NEXT_PUBLIC_AUTH_MODE=mock). */
function MockPicker({ onNext }: { onNext: () => void }) {
  const c = event.signIn;
  const { signInAs } = useAuth();
  const [query, setQuery] = useState("");

  const roster = useMemo(() => getRosterSorted(), []);
  const filtered = useMemo(
    () => roster.filter((m) => m.displayName.toLowerCase().includes(query.trim().toLowerCase())),
    [roster, query],
  );

  const pick = async (id: string) => {
    if (await signInAs(id)) onNext();
  };

  return (
    <div className="flex w-full max-w-lg flex-col items-center text-center lg:max-w-xl">
      <p className="eyebrow">{c.eyebrow}</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl lg:text-5xl">
        Demo mode · pick your name
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted lg:text-lg">{c.subtitle}</p>

      {event.superAdmins.length > 0 && (
        <div className="mt-8 flex w-full flex-col gap-2">
          {event.superAdmins.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => void pick(a.email)}
              className="flex w-full items-center gap-3 rounded-xl border border-gold/40 bg-gold-soft/30 px-4 py-3 text-left transition-colors hover:border-gold"
            >
              <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-gold text-[#0e1a33]">
                ⚡
              </span>
              <span className="text-sm font-semibold text-navy lg:text-base">{a.name}</span>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-gold-deep">
                super admin
              </span>
            </button>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your name…"
        className="mt-3 w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-base text-ink outline-none transition-colors focus:border-verve"
      />

      <div className="mt-3 max-h-64 w-full divide-y divide-line overflow-auto rounded-xl border border-line bg-surface text-left lg:max-h-80">
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center font-mono text-[12px] text-faint">no match</p>
        )}
        {filtered.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => void pick(m.id)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-verve-soft"
          >
            <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-verve-soft font-display text-[12px] font-bold text-verve">
              {m.displayName
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)}
            </span>
            <span className="text-sm font-medium text-ink lg:text-base">{m.displayName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
