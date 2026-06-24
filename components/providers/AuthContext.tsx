"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getAuthBackend, type AuthBackend, type Session } from "@/lib/auth";

interface AuthContextValue {
  session: Session | null;
  /** False until the persisted session has been checked (avoids hydration flash). */
  ready: boolean;
  signInAs: (memberId: string) => Session | null;
  signInWithGoogle: () => Promise<Session>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const backendRef = useRef<AuthBackend | null>(null);
  if (backendRef.current === null) {
    backendRef.current = getAuthBackend();
  }
  const backend = backendRef.current;

  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(backend.getSession());
    setReady(true);
  }, [backend]);

  const signInAs = useCallback(
    (memberId: string) => {
      const next = backend.signInAs(memberId);
      if (next) setSession(next);
      return next;
    },
    [backend],
  );

  const signInWithGoogle = useCallback(async () => {
    const next = await backend.signInWithGoogle();
    setSession(next);
    return next;
  }, [backend]);

  const signOut = useCallback(() => {
    backend.signOut();
    setSession(null);
  }, [backend]);

  const value = useMemo(
    () => ({ session, ready, signInAs, signInWithGoogle, signOut }),
    [session, ready, signInAs, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
