import { MockAuthBackend } from "./mockBackend";
import type { AuthBackend } from "./types";

/*
  Factory: chooses the auth backend by env. Default is the mock.
  Phase 2: add lib/auth/googleBackend.ts implementing AuthBackend, then set
  NEXT_PUBLIC_AUTH_MODE=google. Nothing in the UI changes.
*/
export function getAuthBackend(): AuthBackend {
  const mode = process.env.NEXT_PUBLIC_AUTH_MODE ?? "mock";
  switch (mode) {
    case "google":
      throw new Error(
        "NEXT_PUBLIC_AUTH_MODE=google is not implemented yet — add lib/auth/googleBackend.ts.",
      );
    case "mock":
    default:
      return new MockAuthBackend();
  }
}

export type { AuthBackend, Session } from "./types";
