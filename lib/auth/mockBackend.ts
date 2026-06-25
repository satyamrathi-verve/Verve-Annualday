import { getMember, getRosterSorted, getSuperAdmin } from "@/lib/data/config";
import type { AuthBackend, Session } from "./types";

const STORAGE_KEY = "getaway.session.key";

/*
  Offline fallback (NEXT_PUBLIC_AUTH_MODE=mock): identity comes from the roster
  via a name picker (or a super-admin email). Persists only the chosen key in
  localStorage. Kept so the funnel + wheel + dashboard stay demoable without
  real auth / email delivery.
*/
export class MockAuthBackend implements AuthBackend {
  readonly mode = "mock" as const;
  private listeners = new Set<(s: Session | null) => void>();

  private resolve(key: string): Session | null {
    const admin = getSuperAdmin(key);
    if (admin) {
      return {
        email: admin.email.toLowerCase(),
        displayName: admin.name,
        memberId: null,
        teamId: null,
        isManager: false,
        isSuperAdmin: true,
      };
    }
    const m = getMember(key);
    if (!m) return null;
    return {
      email: m.email ?? `${m.id}@verve.demo`,
      displayName: m.displayName,
      memberId: m.id,
      teamId: m.teamId,
      isManager: m.isManager,
      isSuperAdmin: false,
    };
  }

  async getSession(): Promise<Session | null> {
    if (typeof window === "undefined") return null;
    const key = window.localStorage.getItem(STORAGE_KEY);
    return key ? this.resolve(key) : null;
  }

  onChange(cb: (s: Session | null) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  listMembers() {
    return getRosterSorted().map((m) => ({ id: m.id, displayName: m.displayName }));
  }

  /** key = a roster member id OR a super-admin email. */
  async signInAs(key: string): Promise<Session | null> {
    const session = this.resolve(key);
    if (session && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, key);
    }
    if (session) this.listeners.forEach((cb) => cb(session));
    return session;
  }

  async signOut(): Promise<void> {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    this.listeners.forEach((cb) => cb(null));
  }
}
