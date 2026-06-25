"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getAuthBackend, type AuthMode, type Session } from "@/lib/auth";

interface AuthContextValue {
  session: Session | null;
  /** False until the persisted session has been checked (avoids hydration flash). */
  ready: boolean;
  mode: AuthMode;
  /** Google flow: redirect to Google (session arrives on return). */
  signInWithGoogle: () => Promise<void>;
  /** Email flow: send a one-time code. */
  sendCode: (email: string) => Promise<void>;
  /** Email flow: verify the typed one-time code. */
  verifyCode: (email: string, token: string) => Promise<Session>;
  /** Mock flow: become a roster member. */
  signInAs: (memberId: string) => Promise<Session | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [backend] = useState(() => getAuthBackend());
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    backend
      .getSession()
      .then((s) => {
        if (active) {
          setSession(s);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setReady(true);
      });
    // Catches the magic-link return (SIGNED_IN) and sign-outs.
    const unsubscribe = backend.onChange((s) => {
      if (active) setSession(s);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [backend]);

  const signInWithGoogle = useCallback(async () => {
    if (!backend.signInWithGoogle) throw new Error("Google sign-in isn't available in this mode.");
    await backend.signInWithGoogle();
  }, [backend]);

  const sendCode = useCallback(
    async (email: string) => {
      if (!backend.sendCode) throw new Error("Email sign-in isn't available in this mode.");
      await backend.sendCode(email);
    },
    [backend],
  );

  const verifyCode = useCallback(
    async (email: string, token: string) => {
      if (!backend.verifyCode) throw new Error("Email sign-in isn't available in this mode.");
      const next = await backend.verifyCode(email, token);
      setSession(next);
      return next;
    },
    [backend],
  );

  const signInAs = useCallback(
    async (memberId: string) => {
      if (!backend.signInAs) throw new Error("The name picker isn't available in this mode.");
      const next = await backend.signInAs(memberId);
      if (next) setSession(next);
      return next;
    },
    [backend],
  );

  const signOut = useCallback(async () => {
    await backend.signOut();
    setSession(null);
  }, [backend]);

  const value = useMemo(
    () => ({
      session,
      ready,
      mode: backend.mode,
      signInWithGoogle,
      sendCode,
      verifyCode,
      signInAs,
      signOut,
    }),
    [session, ready, backend.mode, signInWithGoogle, sendCode, verifyCode, signInAs, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
