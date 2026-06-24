import { getMember } from "@/lib/data/config";
import type { AuthBackend, Session } from "./types";

const STORAGE_KEY = "getaway.session.memberId";

/*
  Mock auth: identity comes from the synthetic roster. We persist only the
  chosen memberId in localStorage and rebuild the Session from config, so the
  "database of users" stays in config/roster.json (no PII, easy to swap).
*/
export class MockAuthBackend implements AuthBackend {
  private sessionFor(memberId: string): Session | null {
    const member = getMember(memberId);
    if (!member) return null;
    return {
      memberId: member.id,
      displayName: member.displayName,
      teamId: member.teamId,
      isManager: member.isManager,
    };
  }

  getSession(): Session | null {
    if (typeof window === "undefined") return null;
    const id = window.localStorage.getItem(STORAGE_KEY);
    return id ? this.sessionFor(id) : null;
  }

  signInAs(memberId: string): Session | null {
    const session = this.sessionFor(memberId);
    if (!session) return null;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, memberId);
    }
    return session;
  }

  async signInWithGoogle(): Promise<Session> {
    throw new Error("Google sign-in is a Phase 2 swap; use the name picker in demo mode.");
  }

  signOut(): void {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }
}
