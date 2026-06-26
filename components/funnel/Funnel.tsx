"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shell, type StepDef } from "./Shell";
import { Landing } from "@/components/screens/Landing";
import { VibeCheck } from "@/components/screens/VibeCheck";
import { SignIn } from "@/components/screens/SignIn";
import { Wait } from "@/components/screens/Wait";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { useAuth } from "@/components/providers/AuthContext";

// Pre-event teaser funnel. The Brief + Guess-Your-Crew (event-day) screens are
// parked — their components still live under components/screens/ and can be
// re-added here when the door opens for real on the 1st.
const STEPS: StepDef[] = [
  { key: "landing", title: "Cold open" },
  { key: "vibe", title: "The teasers" },
  { key: "signin", title: "The door" },
  { key: "wait", title: "Now we wait" },
];

const RESUME_KEY = "getaway.funnel.index";
// Where to land after a sign-out / idle auto-logout — the Google sign-in step.
const SIGNIN_INDEX = Math.max(0, STEPS.findIndex((s) => s.key === "signin"));

export function Funnel() {
  // Wait for the persisted/auth session check before rendering the funnel. This
  // also means the resume-from-storage below runs only on the client (after the
  // OAuth redirect returns), so there's no hydration mismatch.
  const { ready, session } = useAuth();
  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-faint">
          loading…
        </span>
      </div>
    );
  }
  // Super admins skip the funnel entirely and get the live all-teams dashboard.
  if (session?.isSuperAdmin) return <AdminDashboard />;
  return <FunnelInner />;
}

function FunnelInner() {
  const { session } = useAuth();

  // Resume where we left off — so a Google/email redirect lands the user back on
  // the step they were on (signed in), instead of all the way at the start.
  const [index, setIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    const saved = window.sessionStorage.getItem(RESUME_KEY);
    const n = saved ? parseInt(saved, 10) : 0;
    return Number.isFinite(n) && n >= 0 && n < STEPS.length ? n : 0;
  });

  const go = (n: number) => {
    if (typeof window !== "undefined") window.sessionStorage.setItem(RESUME_KEY, String(n));
    setIndex(n);
  };
  const next = () => go(Math.min(STEPS.length - 1, index + 1));
  const back = () => go(Math.max(0, index - 1));

  // When the session ends (manual or 15-min idle auto-logout), throw back to the
  // Google sign-in screen so a logged-out device doesn't linger on an inner step.
  const wasSignedIn = useRef(Boolean(session));
  useEffect(() => {
    const signedIn = Boolean(session);
    if (wasSignedIn.current && !signedIn) {
      if (typeof window !== "undefined") window.sessionStorage.setItem(RESUME_KEY, String(SIGNIN_INDEX));
      setIndex(SIGNIN_INDEX);
    }
    wasSignedIn.current = signedIn;
  }, [session]);

  const vibeIndex = STEPS.findIndex((s) => s.key === "vibe");

  const key = STEPS[index].key;
  const screen = (() => {
    switch (key) {
      case "landing":
        return <Landing onNext={next} />;
      case "vibe":
        return <VibeCheck onNext={next} />;
      case "signin":
        return <SignIn onNext={next} />;
      case "wait":
        return <Wait onReplay={() => go(vibeIndex)} />;
      default:
        return null;
    }
  })();

  return (
    <Shell steps={STEPS} index={index} canGoBack={index > 0} onBack={back}>
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full justify-center"
        >
          {screen}
        </motion.div>
      </AnimatePresence>
    </Shell>
  );
}
