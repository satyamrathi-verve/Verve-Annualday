"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/components/providers/AuthContext";
import { useTeamWheel, type WheelMember } from "@/lib/realtime/useTeamWheel";
import { useTeamsProgress } from "@/lib/realtime/useTeamsProgress";
import { Wheel } from "@/components/wheel/Wheel";
import { ClueCard } from "@/components/wheel/ClueCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { GodModePanel } from "@/components/admin/GodModePanel";
import { clsx } from "@/lib/clsx";
import { event, getTeam } from "@/lib/data/config";

/** Lenient name match: full name or first name, case/space-insensitive. */
function matchesName(input: string, displayName: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const a = norm(input);
  const b = norm(displayName);
  if (!a) return false;
  return a === b || a === b.split(" ")[0];
}

export function GuessYourCrew() {
  const { session } = useAuth();

  if (!session) {
    return <p className="font-mono text-sm text-muted">Sign in first to assemble your crew.</p>;
  }

  // Email-authed but not yet matched to a roster entry (team + clues).
  if (!session.teamId || !session.memberId) {
    return (
      <div className="w-full max-w-xl text-center">
        <p className="eyebrow">Stage one · assemble</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl lg:text-5xl">
          You&apos;re in, {session.displayName.split(" ")[0]}.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted lg:text-lg">
          Verified as <span className="font-mono text-navy">{session.email}</span> — but you&apos;re
          not on a crew roster yet. Once the real roster lands, your team and clues light up here.
        </p>
      </div>
    );
  }

  return <CrewBoard teamId={session.teamId} selfId={session.memberId} isManager={session.isManager} />;
}

function CrewBoard({
  teamId,
  selfId,
  isManager,
}: {
  teamId: string;
  selfId: string;
  isManager: boolean;
}) {
  const c = event.guess;
  const reduce = useReducedMotion();
  const team = getTeam(teamId);
  const wheel = useTeamWheel(teamId, selfId);
  const {
    members,
    online,
    greenCount,
    yellowCount,
    total,
    complete,
    ready,
    guess,
    reveal,
    reset,
    backendKind,
  } = wheel;
  const color = team?.color ?? "#3d77ff";

  // The teammate I most recently guessed — drives the pending/confirmed banner.
  const [lastGuessedId, setLastGuessedId] = useState<string | null>(null);
  // The node whose decode sheet is open.
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  // One-shot "Mutual! {name} named you back" celebration toast.
  const [mutualToast, setMutualToast] = useState<{ name: string; key: number } | null>(null);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // My share = the teammates I'm assigned to guess. A target drops off once I've
  // guessed it OR it's already confirmed green (e.g. a manager revealed it).
  const myGuessedSet = useMemo(() => new Set(wheel.myGuessed), [wheel.myGuessed]);
  const myTargetSet = useMemo(() => new Set(wheel.myTargets), [wheel.myTargets]);
  const pendingTargets = useMemo(
    () =>
      wheel.myTargets
        .map((id) => byId.get(id))
        .filter((m): m is WheelMember => Boolean(m))
        .filter((m) => !myGuessedSet.has(m.id) && m.status !== "green"),
    [wheel.myTargets, byId, myGuessedSet],
  );

  const myShare = wheel.myTargets.length;
  const myCount = wheel.myGuessed.length;
  const myDone = pendingTargets.length === 0;
  const nothingLit = greenCount === 0 && yellowCount === 0;
  const actionableIds = useMemo(() => new Set(pendingTargets.map((m) => m.id)), [pendingTargets]);

  // Watch for any of MY targets flipping to green (they named me back) → toast.
  const prevStatus = useRef<Record<string, string>>({});
  useEffect(() => {
    const prev = prevStatus.current;
    const next: Record<string, string> = {};
    let justMutual: string | null = null;
    for (const m of members) {
      next[m.id] = m.status;
      if (prev[m.id] && prev[m.id] !== "green" && m.status === "green" && myTargetSet.has(m.id)) {
        justMutual = m.displayName;
      }
    }
    prevStatus.current = next;
    // A realtime status flip → green is an external event; surface the
    // celebration toast on the next microtask rather than synchronously, so it
    // isn't a cascading render off this effect body.
    if (justMutual) {
      const name = justMutual;
      queueMicrotask(() => setMutualToast({ name, key: Date.now() }));
    }
  }, [members, myTargetSet]);

  useEffect(() => {
    if (!mutualToast) return;
    const t = window.setTimeout(() => setMutualToast(null), 1700);
    return () => window.clearTimeout(t);
  }, [mutualToast]);

  const lastGuessed = lastGuessedId ? byId.get(lastGuessedId) : undefined;
  const banner = lastGuessed
    ? lastGuessed.status === "green"
      ? { tone: "green" as const, text: c.confirmedNote.replace("{name}", lastGuessed.displayName) }
      : { tone: "yellow" as const, text: c.pendingNote.replace("{name}", lastGuessed.displayName) }
    : null;

  const openSheet = (id: string) => {
    if (!byId.get(id)) return;
    setOpenNodeId(id);
  };

  const onGuess = (name: string): boolean => {
    const target = openNodeId ? byId.get(openNodeId) : undefined;
    if (!target) return false;
    if (matchesName(name, target.displayName)) {
      void guess(target.id);
      setLastGuessedId(target.id);
      setOpenNodeId(null);
      return true;
    }
    return false;
  };

  const header = (align: "center" | "left") => (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <p className="eyebrow">{c.eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl lg:text-5xl">
        {c.title}
      </h1>
      <div
        className={clsx(
          "mt-3 flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted lg:text-xs",
          align === "center" ? "justify-center" : "justify-start",
        )}
      >
        <span className="font-bold" style={{ color }}>
          {team?.name ?? teamId}
        </span>
        <span className="text-line">|</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-verve" />
          {online.length} in the room
        </span>
        <span className="text-line">|</span>
        <span className={backendKind === "supabase" ? "text-verve" : "text-faint"}>
          {backendKind === "supabase" ? "● LIVE" : "○ local demo"}
        </span>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-5xl lg:max-w-6xl">
      {!ready ? (
        <>
          {header("center")}
          <LoadingPanel lines={c.loading} />
        </>
      ) : total === 0 ? (
        <>
          {header("center")}
          <div className="surface-card mx-auto mt-10 max-w-md rounded-2xl p-6 text-center">
            <p className="font-display text-xl font-bold text-navy">{c.errorTitle}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{c.errorBody}</p>
          </div>
        </>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Wheel — left, enlarged to fill the column */}
          <div className="flex flex-col items-center">
            <Wheel
              members={members}
              color={color}
              greenCount={greenCount}
              yellowCount={yellowCount}
              total={total}
              complete={complete}
              actionableIds={actionableIds}
              onNodeClick={openSheet}
            />
            <p className="mt-4 text-center font-mono text-[11px] tracking-wider text-faint lg:text-xs">
              {greenCount} / {total} confirmed · {yellowCount} pending · updates live as your crew
              guesses
            </p>
          </div>

          {/* Content column: title → your share → status */}
          <div className="flex flex-col gap-5">
            {header("left")}
            {/* Your share tracker */}
            {!complete && myShare > 0 && (
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold-deep lg:text-xs">
                  Your share
                </span>
                <div className="flex gap-1.5">
                  {Array.from({ length: myShare }).map((_, i) => (
                    <span
                      key={i}
                      className={clsx(
                        "h-2 w-2 rounded-full transition-colors",
                        i < myCount ? "bg-gold" : "bg-line",
                      )}
                    />
                  ))}
                </div>
                <span className="ml-auto font-mono text-[11px] text-muted lg:text-xs">
                  {myCount} / {myShare} guessed
                </span>
              </div>
            )}

            {/* Pending / confirmed banner for the teammate I just guessed */}
            <AnimatePresence>
              {banner && (
                <motion.div
                  key={`${lastGuessedId}-${banner.tone}`}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={clsx(
                    "rounded-xl border px-4 py-3 text-[13px] leading-relaxed",
                    banner.tone === "green"
                      ? "border-node-live/40 bg-node-live/15 text-node-live"
                      : "border-gold/40 bg-gold/15 text-gold-deep",
                  )}
                >
                  {banner.text}
                </motion.div>
              )}
            </AnimatePresence>

            {complete ? (
              <FinaleCard title={c.completeTitle} subtitle={c.completeSubtitle} />
            ) : myDone ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard accent className="p-6 text-center">
                  <h2 className="font-display text-2xl font-extrabold text-navy lg:text-3xl">
                    {c.partDoneTitle}
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-muted">{c.partDoneSubtitle}</p>
                  <p className="mt-4 font-mono text-[11px] tracking-wider text-gold-deep lg:text-xs">
                    {total - greenCount} still to confirm · watching the wheel
                  </p>
                </GlassCard>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard accent className="p-6">
                  <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-gold-deep">
                    {nothingLit ? "Standing by" : "Warming up"}
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-muted">
                    {nothingLit ? c.emptyHint : c.clickHint}
                  </p>
                  <div className="mt-4 flex items-center gap-4 font-mono text-[11px] text-faint">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-node-idle ring-1 ring-verve-400" />
                      idle
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-gold-400" />
                      yours
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-node-live" />
                      mutual
                    </span>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {isManager && (
              <GodModePanel
                members={members}
                onReveal={(id) => void reveal(id)}
                onReset={() => void reset()}
              />
            )}
          </div>
        </div>
      )}

      <OtherCrews currentTeamId={teamId} />

      {/* Decode-the-canister bottom sheet */}
      <DecodeSheet
        open={openNodeId !== null}
        onClose={() => setOpenNodeId(null)}
        reduce={reduce}
      >
        {openNodeId && byId.get(openNodeId) && (
          <ClueCard
            clues={byId.get(openNodeId)!.clues}
            onGuess={onGuess}
            wrongNote={c.wrongNote}
            title={c.clueSheetTitle}
          />
        )}
      </DecodeSheet>

      {/* Mutual celebration toast */}
      <AnimatePresence>
        {mutualToast && (
          <motion.div
            key={mutualToast.key}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="fixed inset-x-0 bottom-8 z-[60] mx-auto w-fit max-w-[90vw] rounded-full border border-node-live/50 bg-node-live/15 px-5 py-2.5 text-center font-display text-sm font-bold text-node-live shadow-[0_18px_40px_-18px_rgba(52,209,127,0.8)] backdrop-blur"
          >
            {c.mutualToast.replace("{name}", mutualToast.name)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingPanel({ lines }: { lines: string[] }) {
  const line = lines[0] ?? "Establishing secure channel…";
  return (
    <div className="mx-auto mt-12 flex max-w-md flex-col items-center text-center">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-verve-400"
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </div>
      <p className="mt-5 font-mono text-[12px] leading-relaxed tracking-wider text-muted">{line}</p>
    </div>
  );
}

function FinaleCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard accent className="p-6 text-center">
        <h2 className="font-display text-2xl font-extrabold text-navy lg:text-3xl">{title}</h2>
        <p className="mt-3 text-base leading-relaxed text-muted">{subtitle}</p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.28em] text-node-live">
          next transmission incoming
        </p>
      </GlassCard>
    </motion.div>
  );
}

function DecodeSheet({
  open,
  onClose,
  reduce,
  children,
}: {
  open: boolean;
  onClose: () => void;
  reduce: boolean | null;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-void/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[55] mx-auto w-full max-w-lg rounded-t-3xl border border-line bg-card p-5 pb-8 shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.85)]"
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 font-mono text-[11px] tracking-wider text-faint transition-colors hover:text-verve"
            >
              close ✕
            </button>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* Live standings for every crew — read-only (no presence), polled. Lets a
   player see how the other teams' wheels are filling without leaving theirs. */
function OtherCrews({ currentTeamId }: { currentTeamId: string }) {
  const standings = useTeamsProgress();

  return (
    <div className="mt-12">
      <p className="text-center font-mono text-[11px] uppercase tracking-[0.28em] text-faint">
        Across the mission · live crew progress
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {standings.map((t) => {
          const pct = t.total ? Math.round((t.greenCount / t.total) * 100) : 0;
          const isMine = t.teamId === currentTeamId;
          return (
            <GlassCard key={t.teamId} accent={isMine} className="p-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 flex-none rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                <span className="truncate font-display text-[13px] font-bold text-navy">
                  {t.name}
                </span>
                {isMine ? (
                  <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.18em] text-verve-400">
                    you
                  </span>
                ) : (
                  t.complete && <span className="ml-auto text-[12px]">✨</span>
                )}
              </div>

              <div className="mt-2 flex items-end justify-between">
                <span className="font-display text-lg font-extrabold leading-none text-navy">
                  {t.greenCount}
                  <span className="text-xs text-faint"> / {t.total}</span>
                </span>
                {t.yellowCount > 0 && (
                  <span className="font-mono text-[10px] text-gold-deep">{t.yellowCount} pending</span>
                )}
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                  className={clsx(
                    "h-full rounded-full transition-[width] duration-700",
                    t.complete ? "bg-node-live shadow-[0_0_10px_0_rgba(52,209,127,0.9)]" : "bg-node-live/80",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
