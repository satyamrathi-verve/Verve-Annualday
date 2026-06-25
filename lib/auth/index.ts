import { GoogleAuthBackend } from "./googleBackend";
import { EmailAuthBackend } from "./emailBackend";
import { MockAuthBackend } from "./mockBackend";
import type { AuthBackend, AuthMode } from "./types";

/*
  Factory: chooses the auth backend by env (NEXT_PUBLIC_AUTH_MODE).
    "google" (default) — real Google sign-in via Supabase. Free, no email.
    "email"            — Supabase email OTP (needs SMTP for volume).
    "mock"             — synthetic name picker, for offline demos / testing.
  `modeOverride` lets the client force a mode at runtime (the ?demo test switch).
*/
export function getAuthBackend(modeOverride?: AuthMode): AuthBackend {
  const mode = modeOverride ?? process.env.NEXT_PUBLIC_AUTH_MODE ?? "google";
  switch (mode) {
    case "mock":
      return new MockAuthBackend();
    case "email":
      return new EmailAuthBackend();
    case "google":
    default:
      return new GoogleAuthBackend();
  }
}

export type { AuthBackend, AuthMode, Session } from "./types";
