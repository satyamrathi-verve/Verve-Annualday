"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shell, type StepDef } from "./Shell";
import { Landing } from "@/components/screens/Landing";
import { VibeCheck } from "@/components/screens/VibeCheck";
import { SignIn } from "@/components/screens/SignIn";
import { Brief } from "@/components/screens/Brief";
import { GuessYourCrew } from "@/components/screens/GuessYourCrew";

const STEPS: StepDef[] = [
  { key: "landing", title: "Cold open" },
  { key: "vibe", title: "Vibe check" },
  { key: "signin", title: "The door" },
  { key: "brief", title: "The briefing" },
  { key: "guess", title: "Guess your crew" },
];

export function Funnel() {
  const [index, setIndex] = useState(0);

  const next = () => setIndex((i) => Math.min(STEPS.length - 1, i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

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
