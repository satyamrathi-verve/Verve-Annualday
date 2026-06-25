"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/AuthContext";
import { useTeamWheel } from "@/lib/realtime/useTeamWheel";
import { Wheel } from "@/components/wheel/Wheel";
import { ClueCard } from "@/components/wheel/ClueCard";
import { GodModePanel } from "@/components/admin/GodModePanel";
import { clsx } from "@/lib/clsx";
import { event, getTeam, roster } from "@/lib/data/config";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function GuessYourCrew() {
  const { session, mode } = useAuth();

  if (!session) {
    return (
      <p className="font-mono text-sm text-muted">Sign in first to assemble your crew.</p>
    );
  }

  // Email-authed but not yet matched to a roster entry (team + clues). Happens
  // until the real roster — keyed by email — is added to config.
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

  return (
    <CrewBoard
      teamId={session.teamId}
      selfId={session.memberId}
      isManager={session.isManager}
      demo={mode === "mock"}
    />
  );
}

function CrewBoard({
  teamId,
  selfId,
  isManager,
  demo,
}: {
  teamId: string;
  selfId: string;
  isManager: boolean;
  demo: boolean;
}) {
  const c = event.guess;
  const team = getTeam(teamId);
  const wheel = useTeamWheel(teamId, selfId);
  const { members, online, litCount, total, complete, light, reset, backendKind } = wheel;
  const color = team?.color ?? "#2f6bff";
  const perPlayer = c.guessesPerPlayer;

  // The teammates THIS login has personally guessed right — drives the 2-guess
  // share. Stays local to the client; the lit canisters themselves are shared.
  const [myGuessed, setMyGuessed] = useState<Set<string>>(new Set());
  const myCount = myGuessed.size;
  const myDone = myCount >= perPlayer;

  // Distractors: real colleagues from OTHER teams — make the guess non-trivial
  // and human-only (an AI can't map a personal quirk to a specific person).
  const distractors = useMemo(
    () => shuffle(roster.filter((m) => m.teamId !== teamId)).slice(0, c.distractorCount),
    [teamId, c.distractorCount],
  );

  // Personalised teammate order so different logins start on different people —
  // the work spreads across the crew instead of everyone racing the same clue.
  const orderedTeammates = useMemo(() => {
    const ms = members.filter((m) => !m.isSelf);
    const ids = team?.memberIds ?? [];
    const off = ms.length ? Math.max(0, ids.indexOf(selfId)) % ms.length : 0;
    return [...ms.slice(off), ...ms.slice(0, off)];
  }, [members, team, selfId]);

  // My current clue: the next teammate I haven't found, skipping any the crew
  // already lit in real time — until I've lit my share.
  const current = myDone
    ? undefined
    : orderedTeammates.find((m) => !m.lit && !myGuessed.has(m.id));

  const candidates = useMemo(() => {
    const pool = members.filter((m) => !m.lit && !m.isSelf && !myGuessed.has(m.id));
    return [...pool, ...distractors]
      .map((m) => ({ id: m.id, displayName: m.displayName }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [members, distractors, myGuessed]);

  const onGuess = (candidateId: string): boolean => {
    if (!current) return false;
    if (candidateId === current.id) {
      void light(current.id, "guess");
      setMyGuessed((s) => new Set(s).add(current.id));
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
            litCount={litCount}
            total={total}
            complete={complete}
          />
          <p className="mt-4 text-center font-mono text-[11px] text-faint lg:text-xs">
            {litCount} / {total} canisters lit · updates live as your crew guesses
          </p>
        </div>

        {/* Guess panel */}
        <div className="flex flex-col gap-5">
          {/* Your share tracker */}
          {!complete && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-wider text-gold-deep lg:text-xs">
                Your share
              </span>
              <div className="flex gap-1.5">
                {Array.from({ length: perPlayer }).map((_, i) => (
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
                {myCount} / {perPlayer} found
              </span>
            </div>
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
                {total - litCount} still to find · watching the wheel
              </p>
            </motion.div>
          ) : current ? (
            <>
              <p className="text-center text-base leading-relaxed text-muted lg:text-left lg:text-lg">
                {c.subtitle}
              </p>
              <ClueCard
                index={myCount + 1}
                total={perPlayer}
                clues={current.clues}
                candidates={candidates}
                onGuess={onGuess}
                revealAnswer={demo ? current.displayName : undefined}
              />
            </>
          ) : (
            // Every teammate was lit by the crew before this login finished its share.
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="surface-card rounded-2xl p-6 text-center"
            >
              <h2 className="font-display text-2xl font-extrabold text-navy lg:text-3xl">
                The crew beat you to it!
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted">
                Every teammate is already lit — your share filled itself. Stand by.
              </p>
            </motion.div>
          )}

          {isManager && (
            <GodModePanel
              members={members}
              onReveal={(id) => void light(id, "godmode")}
              onReset={() => void reset()}
            />
          )}
        </div>
      </div>
    </div>
  );
}
