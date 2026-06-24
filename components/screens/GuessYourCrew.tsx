"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/AuthContext";
import { useTeamWheel } from "@/lib/realtime/useTeamWheel";
import { Wheel } from "@/components/wheel/Wheel";
import { ClueCard } from "@/components/wheel/ClueCard";
import { GodModePanel } from "@/components/admin/GodModePanel";
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
  const { session } = useAuth();

  if (!session) {
    return (
      <p className="font-mono text-sm text-muted">Sign in first to assemble your crew.</p>
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
  const { members, online, litCount, total, complete, light, reset, backendKind } = wheel;
  const color = team?.color ?? "#2f6bff";

  // Distractors: real colleagues from OTHER teams — make the guess non-trivial
  // and human-only (an AI can't map a personal quirk to a specific person).
  const distractors = useMemo(
    () => shuffle(roster.filter((m) => m.teamId !== teamId)).slice(0, c.distractorCount),
    [teamId, c.distractorCount],
  );

  const teammates = members.filter((m) => !m.isSelf);
  const foundCount = teammates.filter((m) => m.lit).length;
  const current = teammates.find((m) => !m.lit);

  const candidates = useMemo(() => {
    const unlitTeammates = members.filter((m) => !m.lit && !m.isSelf);
    return [...unlitTeammates, ...distractors]
      .map((m) => ({ id: m.id, displayName: m.displayName }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [members, distractors]);

  const onGuess = (candidateId: string): boolean => {
    if (!current) return false;
    if (candidateId === current.id) {
      void light(current.id, "guess");
      return true;
    }
    return false;
  };

  return (
    <div className="w-full max-w-5xl">
      <div className="text-center">
        <p className="eyebrow">{c.eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
          {c.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 font-mono text-[11px] text-muted">
          <span className="font-bold" style={{ color }}>
            {team?.name ?? teamId}
          </span>
          <span className="text-line">|</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-verve" />
            {online.length} in the room
          </span>
          <span className="text-line">|</span>
          <span
            className={
              backendKind === "supabase" ? "text-verve" : "text-faint"
            }
          >
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
        </div>

        {/* Guess panel */}
        <div className="flex flex-col gap-5">
          {complete ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="surface-card rounded-2xl p-6 text-center"
            >
              <h2 className="font-display text-2xl font-extrabold text-navy">{c.completeTitle}</h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">{c.completeSubtitle}</p>
            </motion.div>
          ) : current ? (
            <>
              <p className="text-center text-[14px] leading-relaxed text-muted lg:text-left">
                {c.subtitle}
              </p>
              <ClueCard
                index={foundCount + 1}
                total={teammates.length}
                clues={current.clues}
                candidates={candidates}
                onGuess={onGuess}
              />
            </>
          ) : (
            <p className="font-mono text-sm text-muted">Waiting for the wheel…</p>
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
