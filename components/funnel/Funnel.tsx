"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Shell, type StepDef } from "./Shell";
import { BurnTransition, supportsMask } from "@/components/transitions/BurnTransition";
import { NavBar, type NavItem } from "./NavBar";
import { useAppSettings } from "@/lib/data/settings";
import { Landing } from "@/components/screens/Landing";
import { VibeCheck } from "@/components/screens/VibeCheck";
import { SignIn } from "@/components/screens/SignIn";
import { Wait } from "@/components/screens/Wait";
import { Brief } from "@/components/screens/Brief";
import { GuessYourCrew } from "@/components/screens/GuessYourCrew";
import { VideoBridge } from "@/components/screens/VideoBridge";
import { ActivityOne } from "@/components/screens/ActivityOne";
import { ActivityTwo } from "@/components/screens/ActivityTwo";
import { Button } from "@/components/ui/Button";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { useAuth } from "@/components/providers/AuthContext";

// Teaser funnel → into the crew-guessing game. "Now We Wait" dives into the
// briefing and the live wheel (Brief + Guess Your Crew).
const STEPS: StepDef[] = [
  { key: "landing", title: "Cold open" },
  { key: "vibe", title: "The teasers" },
  { key: "signin", title: "The door" },
  { key: "wait", title: "Now we wait" },
  { key: "brief", title: "The briefing" },
  { key: "guess", title: "Guess your crew" },
  { key: "bridge1", title: "Transmission" },
  { key: "activity1", title: "About Me" },
  { key: "bridge2", title: "Transmission" },
  { key: "activity2", title: "Build Dashboard" },
  { key: "bridge3", title: "Wrap" },
];

const RESUME_KEY = "getaway.funnel.index";
// Where to land after a sign-out / idle auto-logout — the Google sign-in step.
const SIGNIN_INDEX = Math.max(0, STEPS.findIndex((s) => s.key === "signin"));
// The teasers reel — where the locked "Now We Wait" screen sends players to read whispers.
const VIBE_INDEX = Math.max(0, STEPS.findIndex((s) => s.key === "vibe"));
const GUESS_INDEX = Math.max(0, STEPS.findIndex((s) => s.key === "guess"));
const ACTIVITY1_INDEX = Math.max(0, STEPS.findIndex((s) => s.key === "activity1"));
const ACTIVITY2_INDEX = Math.max(0, STEPS.findIndex((s) => s.key === "activity2"));
// Steps that require a session — a logged-out reload must not resume onto these.
const AUTH_GATED = new Set([
  "wait",
  "brief",
  "guess",
  "bridge1",
  "activity1",
  "bridge2",
  "activity2",
  "bridge3",
]);

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
  const reduce = useReducedMotion();
  const { guessOpen: open, activity1Open, activity2Open } = useAppSettings();
  // Drives the self-destruct "char" overlay on every forward hand-off.
  const [burning, setBurning] = useState(false);

  // Resume where we left off — so a Google/email redirect lands the user back on
  // the step they were on (signed in), instead of all the way at the start. But
  // never resume onto the auth-gated "Now We Wait" step without a session (e.g.
  // the cached session failed server validation on reload), which would strand a
  // logged-out device on an inner screen — start at sign-in instead.
  const [index, setIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    const saved = window.sessionStorage.getItem(RESUME_KEY);
    const parsed = saved ? parseInt(saved, 10) : 0;
    const n = Number.isFinite(parsed) && parsed >= 0 && parsed < STEPS.length ? parsed : 0;
    if (!session && AUTH_GATED.has(STEPS[n].key)) return SIGNIN_INDEX;
    return n;
  });

  const go = (n: number) => {
    if (typeof window !== "undefined") window.sessionStorage.setItem(RESUME_KEY, String(n));
    setIndex(n);
  };
  const next = () => go(Math.min(STEPS.length - 1, index + 1));
  const back = () => go(Math.max(0, index - 1));

  // Forward hand-off ("Dive into it" → briefing, "Spin up the wheel" → wheel):
  // play the self-destruct burn, which advances the funnel one step under cover.
  // Falls back to a plain advance when motion is reduced or mask-image is unsupported.
  const ignite = () => {
    if (reduce || !supportsMask) {
      next();
      return;
    }
    setBurning(true);
  };

  // When the session ENDS while the tab is open (15-min idle auto-logout, manual
  // sign-out, or a token refresh that discovers the user was deleted), throw back
  // to the Google sign-in screen. The reload/fresh-load case is handled by the
  // index initializer above.
  const wasSignedIn = useRef(Boolean(session));
  useEffect(() => {
    const signedIn = Boolean(session);
    if (wasSignedIn.current && !signedIn) {
      if (typeof window !== "undefined") window.sessionStorage.setItem(RESUME_KEY, String(SIGNIN_INDEX));
      setIndex(SIGNIN_INDEX);
    }
    wasSignedIn.current = signedIn;
  }, [session]);

  const key = STEPS[index].key;

  // Top nav (page switcher). Only the pages the host has UNLOCKED and the player
  // can actually open are shown — locked pages are hidden, not dimmed. This also
  // keeps the nav from bypassing the "Now We Wait" lock.
  const navItems: NavItem[] = [];
  if (session) {
    navItems.push({ key: "vibe", label: "Whispers", onClick: () => go(VIBE_INDEX), active: key === "vibe" });
    if (open && session.teamId) {
      navItems.push({
        key: "guess",
        label: "The Wheel",
        onClick: () => go(GUESS_INDEX),
        active: key === "guess" || key === "brief",
      });
    }
    if (activity1Open) {
      navItems.push({
        key: "activity1",
        label: "About Me",
        onClick: () => go(ACTIVITY1_INDEX),
        active: key === "activity1" || key === "bridge1",
      });
    }
    if (activity2Open) {
      navItems.push({
        key: "activity2",
        label: "Build Dashboard",
        onClick: () => go(ACTIVITY2_INDEX),
        active: key === "activity2" || key === "bridge2" || key === "bridge3",
      });
    }
  }

  const screen = (() => {
    switch (key) {
      case "landing":
        return <Landing onNext={next} />;
      case "vibe":
        return <VibeCheck onNext={next} />;
      case "signin":
        return <SignIn onNext={next} />;
      case "wait":
        return <Wait onNext={ignite} onWhispers={() => go(VIBE_INDEX)} />;
      case "brief":
        return <Brief onNext={ignite} />;
      case "guess":
        return <GuessYourCrew />;
      case "bridge1":
        return (
          <VideoBridge
            eyebrow="Transmission · incoming"
            title="Crew assembled. Your next mission…"
            ctaLabel="Begin Activity 1 →"
            onNext={ignite}
          />
        );
      case "activity1":
        return <ActivityOne />;
      case "bridge2":
        return (
          <VideoBridge
            eyebrow="Transmission · incoming"
            title="Profiles are live. Next up…"
            ctaLabel="Begin Activity 2 →"
            onNext={ignite}
          />
        );
      case "activity2":
        return <ActivityTwo />;
      case "bridge3":
        return (
          <VideoBridge
            eyebrow="Transmission · final"
            title="That's a wrap."
            caption="More soon. Keep it off the books."
          />
        );
      default:
        return null;
    }
  })();

  // Sequential "Continue" between activities — appears once the next stop is open.
  const forward =
    key === "guess" && activity1Open
      ? "Continue to Activity 1 →"
      : key === "activity1" && activity2Open
        ? "Continue to Activity 2 →"
        : key === "activity2"
          ? "Wrap up →"
          : null;

  return (
    <>
      <Shell
      steps={STEPS}
      index={index}
      canGoBack={index > 0}
      onBack={back}
      nav={<NavBar items={navItems} />}
    >
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

        {forward && (
          <div className="mt-6 flex w-full justify-center">
            <Button variant="gold" glow onClick={ignite}>
              {forward}
            </Button>
          </div>
        )}
      </Shell>

      {/* Self-destruct char overlay — covers the brief→guess swap, then chars away
          to reveal the wheel. Lives outside AnimatePresence so Brief's exit fade
          can't fade the fire. */}
      {burning && (
        <BurnTransition onCovered={next} onComplete={() => setBurning(false)} />
      )}
    </>
  );
}
