"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/components/providers/AuthContext";
import { supabaseEnabled } from "@/lib/supabase/client";
import { clsx } from "@/lib/clsx";
import { AttendeesPanel } from "./AttendeesPanel";
import { LiveProgressPanel } from "./LiveProgressPanel";

type Tab = "signins" | "progress";

const TABS: Array<{ key: Tab; label: string; title: string }> = [
  { key: "signins", label: "Sign-ins", title: "Who's in the portal." },
  { key: "progress", label: "Live progress", title: "All crews, live." },
];

/*
  Super-admin mission control. Two views share one themed shell:
    · Sign-ins (default) — who has logged into the portal, with a CSV export.
    · Live progress      — each crew's game-day wheel (goes live on game day).
  Routed here from the funnel for any session flagged isSuperAdmin.
*/
export function AdminDashboard() {
  const { session, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("signins");
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="min-h-dvh px-5 py-8 sm:px-8 lg:px-12">
      {/* header */}
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4">
        <Image
          src="/verve-logo.png"
          alt="Verve Advisory"
          width={720}
          height={250}
          priority
          className="h-10 w-auto sm:h-12"
        />
        <div className="ml-auto flex items-center gap-4">
          <span
            className={clsx(
              "font-mono text-xs tracking-widest",
              supabaseEnabled ? "text-verve" : "text-faint",
            )}
          >
            {supabaseEnabled ? "● LIVE" : "○ local demo"}
          </span>
          {session?.email && (
            <span className="hidden font-mono text-[11px] tracking-wider text-faint sm:inline">
              {session.email}
            </span>
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            className="font-mono text-[11px] tracking-wider text-faint transition-colors hover:text-verve"
          >
            sign out
          </button>
        </div>
      </header>

      {/* title + tabs */}
      <div className="mx-auto mt-7 w-full max-w-6xl">
        <p className="eyebrow">Mission control · super admin</p>
        <AnimatePresence mode="wait">
          <motion.h1
            key={active.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-1 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl lg:text-5xl"
          >
            {active.title}
          </motion.h1>
        </AnimatePresence>

        <div className="mt-5 inline-flex rounded-full border border-line bg-surface-2/60 p-1">
          {TABS.map((t) => {
            const isActive = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={clsx(
                  "relative rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors sm:text-[12px]",
                  isActive ? "text-[#0e1a33]" : "text-faint hover:text-navy",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="admin-tab-pill"
                    className="absolute inset-0 rounded-full bg-gold"
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* active panel */}
      <div className="mt-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === "signins" ? <AttendeesPanel /> : <LiveProgressPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
