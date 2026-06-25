"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shell, type StepDef } from "./Shell";
import { Landing } from "@/components/screens/Landing";
import { VibeCheck } from "@/components/screens/VibeCheck";
import { SignIn } from "@/components/screens/SignIn";
import { Brief } from "@/components/screens/Brief";
import { GuessYourCrew } from "@/components/screens/GuessYourCrew";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { useAuth } from "@/components/providers/AuthContext";

const STEPS: StepDef[] = [
  { key: "landing", title: "Cold open" },
  { key: "vibe", title: "Vibe check" },
  { key: "signin", title: "The door" },
  { key: "brief", title: "The briefing" },
  { key: "guess", title: "Guess your crew" },
];

const RESUME_KEY = "getaway.funnel.index";

export function Funnel() {
  // Wait for the persisted/auth session check before rendering the funnel. This
  // also means the resume-from-storage below runs only on the client (after the
  // OAuth redirect returns), so there's no hydration mismatch.
  const { ready, session, mode } = useAuth();
  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-faint">
          loading…
        </span>
      </div>
    );
  }
  return (
    <>
      {mode === "mock" && <DemoBadge />}
      {/* Super admins skip the funnel and get the live all-teams dashboard. */}
      {session?.isSuperAdmin ? <AdminDashboard /> : <FunnelInner />}
    </>
  );
}

function DemoBadge() {
  return (
    <div className="fixed bottom-4 left-4 z-50 rounded-full border border-gold/50 bg-gold-soft px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-gold-deep shadow-[0_8px_20px_-12px_rgba(224,164,54,0.8)]">
      🧪 demo mode · pick any name
    </div>
  );
}

function FunnelInner() {
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

  const key = STEPS[index].key;
  const screen = (() => {
    switch (key) {
      case "landing":
        return <Landing onNext={next} />;
      case "vibe":
        return <VibeCheck onNext={next} />;
      case "signin":
        return <SignIn onNext={next} />;
      case "brief":
        return <Brief onNext={next} />;
      case "guess":
        return <GuessYourCrew />;
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
