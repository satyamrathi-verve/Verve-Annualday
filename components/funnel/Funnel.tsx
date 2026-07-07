"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Shell, type StepDef } from "./Shell";
import { BurnTransition, supportsMask } from "@/components/transitions/BurnTransition";
import { NavBar, type NavItem } from "./NavBar";
import { useAppSettings } from "@/lib/data/settings";
import { useSubmissions } from "@/lib/data/activity1";
import { useTeamSubmissions } from "@/lib/data/activity2";
import { useVideos } from "@/lib/data/videos";
import { event } from "@/lib/data/config";
import { Landing } from "@/components/screens/Landing";
import { VibeCheck } from "@/components/screens/VibeCheck";
import { SignIn } from "@/components/screens/SignIn";
import { Wait } from "@/components/screens/Wait";
import { Brief } from "@/components/screens/Brief";
import { GuessYourCrew } from "@/components/screens/GuessYourCrew";
import { VideoBridge } from "@/components/screens/VideoBridge";
import { GateScreen } from "@/components/screens/GateScreen";
import { ProfileGallery } from "@/components/screens/ProfileGallery";
import { ActivityOne } from "@/components/screens/ActivityOne";
import { ActivityTwo } from "@/components/screens/ActivityTwo";
import { Button } from "@/components/ui/Button";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { useAuth } from "@/components/providers/AuthContext";

// Teaser funnel → crew-guessing game → the two task arcs. Each arc is:
//   short video → date-gated "wait for <date>" → intro video → the activity →
//   closing video. The wait screens flip to a "continue" CTA the moment the host
//   opens that activity's toggle.
const STEPS: StepDef[] = [
  { key: "landing", title: "Cold open" },
  { key: "vibe", title: "The teasers" },
  { key: "signin", title: "The door" },
  { key: "wait", title: "Now we wait" },
  { key: "brief", title: "The briefing" },
  { key: "guess", title: "Guess your crew" },
  { key: "wheelOutro", title: "Transmission" },
  { key: "wait1", title: "Task 1 incoming" },
  { key: "a1intro", title: "Task 1 brief" },
  { key: "activity1", title: "About Me" },
  { key: "a1outro", title: "Task 1 wrap" },
  { key: "wait2", title: "Task 2 incoming" },
  { key: "a2intro", title: "Task 2 brief" },
  { key: "activity2", title: "Build the tool" },
  { key: "bridge3", title: "Wrap" },
];

// Bump the suffix whenever STEPS' order/length changes, so a tab left open across
// a deploy can't resolve a pre-change saved index onto a mismatched screen — a
// stale read simply misses and falls back to the start (or the sign-in gate).
const RESUME_KEY = "getaway.funnel.index.v2";
// Where to land after a sign-out / idle auto-logout — the Google sign-in step.
const SIGNIN_INDEX = Math.max(0, STEPS.findIndex((s) => s.key === "signin"));
// The teasers reel — where the locked "Now We Wait" screen sends players to read whispers.
const VIBE_INDEX = Math.max(0, STEPS.findIndex((s) => s.key === "vibe"));
const GUESS_INDEX = Math.max(0, STEPS.findIndex((s) => s.key === "guess"));
const ACTIVITY1_INDEX = Math.max(0, STEPS.findIndex((s) => s.key === "activity1"));
const ACTIVITY2_INDEX = Math.max(0, STEPS.findIndex((s) => s.key === "activity2"));
// The Activity 2 pre-video ("Task 2 · intro") — where a fresh sign-in lands.
const A2INTRO_INDEX = Math.max(0, STEPS.findIndex((s) => s.key === "a2intro"));
// Which nav tab each step lights up.
const ACTIVITY1_KEYS = new Set(["wheelOutro", "wait1", "a1intro", "activity1", "a1outro"]);
const ACTIVITY2_KEYS = new Set(["wait2", "a2intro", "activity2", "bridge3"]);

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
  const { guessOpen: open, activity1Open, activity2Open, ready: settingsReady } = useAppSettings();
  const { videos } = useVideos();
  // Whether THIS player has submitted their Activity 1 link — the "let's move
  // ahead" CTA only appears once they have, so nobody skips past unbuilt.
  const { submissions } = useSubmissions();
  // Whether THIS player's team LEAD has submitted the built tool — the Activity 2
  // "let's move ahead" CTA only appears once they have, so nobody leaves the build
  // page before the team has wrapped up.
  const { byTeam: teamSubs } = useTeamSubmissions();
  // Drives the self-destruct "char" overlay on every forward hand-off.
  const [burning, setBurning] = useState(false);

  // Direct flow: a fresh visitor lands on the Google sign-in; signing in drops them
  // straight at the Activity 2 pre-video (a2intro). The cold open, teasers, crew
  // wheel and Activity 1 are skipped in the linear path. A Google/email redirect
  // returns here already signed in, so we resume within the Activity 2 arc.
  const [index, setIndex] = useState(() => {
    if (typeof window === "undefined") return SIGNIN_INDEX;
    // Not signed in → the sign-in door, every time.
    if (!session) return SIGNIN_INDEX;
    // Signed in → resume only within the Activity 2 arc (a2intro → activity2 →
    // bridge3); anything earlier or unsaved jumps forward to the pre-video.
    const saved = window.sessionStorage.getItem(RESUME_KEY);
    const parsed = saved ? parseInt(saved, 10) : NaN;
    const n =
      Number.isFinite(parsed) && parsed >= A2INTRO_INDEX && parsed < STEPS.length
        ? parsed
        : A2INTRO_INDEX;
    return n;
  });

  const go = (n: number) => {
    if (typeof window !== "undefined") window.sessionStorage.setItem(RESUME_KEY, String(n));
    setIndex(n);
  };
  const next = () => go(Math.min(STEPS.length - 1, index + 1));
  const back = () => go(Math.max(0, index - 1));

  // Forward hand-off: play the self-destruct burn, which advances the funnel one
  // step under cover. Falls back to a plain advance when motion is reduced or
  // mask-image is unsupported.
  const ignite = () => {
    if (reduce || !supportsMask) {
      next();
      return;
    }
    setBurning(true);
  };

  // When the session ENDS while the tab is open (idle auto-logout, manual
  // sign-out, deleted user), throw back to the Google sign-in screen.
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
  // can actually open are shown — locked pages are hidden, not dimmed.
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
        active: ACTIVITY1_KEYS.has(key),
      });
    }
    if (activity2Open) {
      navItems.push({
        key: "activity2",
        label: "Build Dashboard",
        onClick: () => go(ACTIVITY2_INDEX),
        active: ACTIVITY2_KEYS.has(key),
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
        // After sign-in, jump straight to the Activity 2 pre-video (skipping the
        // wheel and Activity 1). This covers in-place email/code sign-in; the Google
        // redirect lands via the initial-index logic above.
        return <SignIn onNext={() => go(A2INTRO_INDEX)} />;
      case "wait":
        return <Wait onNext={ignite} onWhispers={() => go(VIBE_INDEX)} />;
      case "brief":
        return <Brief onNext={ignite} />;
      case "guess":
        // The "Let's move ahead →" CTA lives INSIDE the wheel and only appears once
        // the team's whole wheel is green (see GuessYourCrew). No Funnel forward here.
        return <GuessYourCrew onNext={ignite} />;
      case "wheelOutro":
        return (
          <VideoBridge
            eyebrow="Transmission · incoming"
            title="Crew assembled."
            caption="The hunt's over. Here's what comes next."
            ctaLabel="Let's move ahead →"
            onNext={ignite}
            src={videos.wheelOutro}
          />
        );
      case "wait1":
        return (
          <GateScreen
            copy={event.taskGates.task1}
            open={activity1Open}
            ready={settingsReady}
            onNext={ignite}
          />
        );
      case "a1intro":
        return (
          <VideoBridge
            eyebrow="Task 1 · briefing"
            title="Your first task."
            ctaLabel="Let's move ahead →"
            onNext={ignite}
            src={videos.a1intro}
          />
        );
      case "activity1":
        return <ActivityOne />;
      case "a1outro":
        return (
          <VideoBridge
            eyebrow="Task 1 · wrap"
            title="Task 1: that's a wrap."
            caption="Nice work. One more thing before the next task…"
            ctaLabel="Let's move ahead →"
            onNext={ignite}
            src={videos.a1outro}
          />
        );
      case "wait2":
        return (
          <GateScreen
            copy={event.taskGates.task2}
            open={activity2Open}
            ready={settingsReady}
            onNext={ignite}
          >
            <ProfileGallery subtitle="Browse and open everyone's pages while you wait." />
          </GateScreen>
        );
      case "a2intro":
        return (
          <VideoBridge
            eyebrow="Task 2 · briefing"
            title="Your next task."
            ctaLabel="Let's move ahead →"
            onNext={ignite}
            src={videos.a2intro}
          />
        );
      case "activity2":
        return <ActivityTwo onComplete={ignite} />;
      case "bridge3":
        return (
          <VideoBridge
            eyebrow="Transmission · final"
            title="That's a wrap."
            caption="More soon. Keep it off the books."
            src={videos.bridge3}
          />
        );
      default:
        return null;
    }
  })();

  // Sequential "Continue" on the screens that don't carry their own forward CTA.
  // (The wheel's "Let's move ahead →" lives inside GuessYourCrew, gated on a
  // full-green team, so it is intentionally absent here.)
  // On Activity 1 the CTA only appears once THIS player has submitted their link,
  // so nobody moves on before they've built and shared a page.
  const a1Submitted =
    Boolean(session?.memberId) && submissions.some((s) => s.memberId === session?.memberId);
  const teamId = session?.teamId;
  const a2Submitted = !!teamId && teamSubs.has(teamId);
  const forward =
    key === "activity1"
      ? a1Submitted
        ? "Let's move ahead →"
        : null
      : key === "activity2"
        ? a2Submitted
          ? "Let's move ahead →"
          : null
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

      {/* Self-destruct char overlay — covers each forward swap, then chars away to
          reveal the next screen. Lives outside AnimatePresence so the exiting
          screen's fade can't fade the fire. */}
      {burning && (
        <BurnTransition onCovered={next} onComplete={() => setBurning(false)} />
      )}
    </>
  );
}
