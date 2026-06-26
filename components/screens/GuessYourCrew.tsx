"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/AuthContext";
import { useTeamWheel, type WheelMember } from "@/lib/realtime/useTeamWheel";
import { useTeamsProgress } from "@/lib/realtime/useTeamsProgress";
import { Wheel } from "@/components/wheel/Wheel";
import { ClueCard } from "@/components/wheel/ClueCard";
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
    return (
      <p className="font-mono text-sm text-muted">Sign in first to assemble your crew.</p>
    );
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
  const team = getTeam(teamId);
  const wheel = useTeamWheel(teamId, selfId);
  const { members, online, greenCount, yellowCount, total, complete, guess, reveal, reset, backendKind } =
    wheel;
  const color = team?.color ?? "#2f6bff";

  // The teammate I most recently guessed — drives the pending/confirmed banner.
  const [lastGuessedId, setLastGuessedId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // My share = the teammates I'm assigned to guess. A target drops off once I've
  // guessed it OR it's already confirmed green (e.g. a manager revealed it).
  const myGuessedSet = useMemo(() => new Set(wheel.myGuessed), [wheel.myGuessed]);
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
  const current = pendingTargets[0];
  const myDone = pendingTargets.length === 0;

  const lastGuessed = lastGuessedId ? byId.get(lastGuessedId) : undefined;
  const banner = lastGuessed
    ? lastGuessed.status === "green"
      ? { tone: "green" as const, text: c.confirmedNote.replace("{name}", lastGuessed.displayName) }
      : { tone: "yellow" as const, text: c.pendingNote.replace("{name}", lastGuessed.displayName) }
    : null;

  const onGuess = (name: string): boolean => {
    if (!current) return false;
    if (matchesName(name, current.displayName)) {
      void guess(current.id);
      setLastGuessedId(current.id);
      return true;
    }
    return false;
  };

  return (
    <div className="w-full max-w-5xl lg:max-w-6xl">
      <div className="text-center">
        <p className="eyebrow">{c.eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl lg:text-5xl">
          {c.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 font-mono text-[11px] text-muted lg:text-xs">
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

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
        {/* Wheel */}
        <div className="flex flex-col items-center">
          <Wheel
            members={members}
            color={color}
            greenCount={greenCount}
            yellowCount={yellowCount}
            total={total}
            complete={complete}
          />
          <p className="mt-4 text-center font-mono text-[11px] text-faint lg:text-xs">
            {greenCount} / {total} confirmed · {yellowCount} pending · updates live as your crew
            guesses
          </p>
        </div>

        {/* Guess panel */}
        <div className="flex flex-col gap-5">
          {/* Your share tracker */}
          {!complete && myShare > 0 && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-wider text-gold-deep lg:text-xs">
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
          {banner && (
            <motion.div
              key={`${lastGuessedId}-${banner.tone}`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={clsx(
                "rounded-xl border px-4 py-3 text-[13px] leading-relaxed",
                banner.tone === "green"
                  ? "border-green-400/40 bg-green-500/15 text-green-300"
                  : "border-gold/40 bg-gold/15 text-gold-deep",
              )}
            >
              {banner.text}
            </motion.div>
          )}

          {complete ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="surface-card rounded-2xl p-6 text-center"
            >
              <h2 className="font-display text-2xl font-extrabold text-navy lg:text-3xl">
                {c.completeTitle}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted">{c.completeSubtitle}</p>
            </motion.div>
          ) : myDone ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="surface-card rounded-2xl p-6 text-center"
            >
              <h2 className="font-display text-2xl font-extrabold text-navy lg:text-3xl">
                {c.partDoneTitle}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted">{c.partDoneSubtitle}</p>
              <p className="mt-4 font-mono text-[11px] text-gold-deep lg:text-xs">
                {total - greenCount} still to confirm · watching the wheel
              </p>
            </motion.div>
          ) : current ? (
            <>
              <p className="text-center text-base leading-relaxed text-muted lg:text-left lg:text-lg">
                {c.subtitle}
              </p>
              <ClueCard
                index={myCount + 1}
                total={myShare}
                clues={current.clues}
                onGuess={onGuess}
                wrongNote={c.wrongNote}
              />
            </>
          ) : null}

          {isManager && (
            <GodModePanel
              members={members}
              onReveal={(id) => void reveal(id)}
              onReset={() => void reset()}
            />
          )}
        </div>
      </div>

      <OtherCrews currentTeamId={teamId} />
    </div>
  );
}

/* Live standings for every crew — read-only (no presence), polled. Lets a
   player see how the other teams' wheels are filling without leaving theirs. */
function OtherCrews({ currentTeamId }: { currentTeamId: string }) {
  const standings = useTeamsProgress();

  return (
    <div className="mt-12">
      <p className="text-center font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
        Across the mission · live crew progress
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {standings.map((t) => {
          const pct = t.total ? Math.round((t.greenCount / t.total) * 100) : 0;
          const isMine = t.teamId === currentTeamId;
          return (
            <div
              key={t.teamId}
              className={clsx(
                "rounded-xl border p-3 transition-colors",
                isMine ? "border-verve/60 bg-verve-soft/50" : "border-line bg-surface/60",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 flex-none rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                <span className="truncate font-display text-[13px] font-bold text-navy">
                  {t.name}
                </span>
                {isMine ? (
                  <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-verve">
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
                  className="h-full rounded-full bg-green-500 transition-[width] duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
