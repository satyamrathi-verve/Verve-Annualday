"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getGuessTargets, getTeamMembers } from "@/lib/data/config";
import type { Member } from "@/lib/data/schema";
import { deriveWheel, type CanisterStatus } from "./derive";
import { getRealtimeBackend } from "./index";
import type { GuessEdge, TeamRoom } from "./types";

export interface WheelMember extends Member {
  /** grey (ungueessed) · yellow (guessed, pending) · green (mutual). */
  status: CanisterStatus;
  isSelf: boolean;
  online: boolean;
}

export interface TeamWheel {
  members: WheelMember[];
  online: string[];
  greenCount: number;
  yellowCount: number;
  total: number;
  complete: boolean;
  ready: boolean;
  backendKind: "supabase" | "mock";
  /** The teammates THIS player must guess (their share). */
  myTargets: string[];
  /** Of my targets, the ids I've already correctly guessed. */
  myGuessed: string[];
  /** Record a correct guess of `targetId` by me. */
  guess: (targetId: string) => Promise<void>;
  reset: () => Promise<void>;
}

/*
  Joins the team's realtime room and derives every canister's colour from the
  shared guess graph. Each player is responsible for guessing their own targets
  (getGuessTargets) — a canister turns green only once two members have guessed
  each other, so no one can complete the wheel alone.
*/
export function useTeamWheel(teamId: string, selfMemberId: string): TeamWheel {
  const [edges, setEdges] = useState<GuessEdge[]>([]);
  const [online, setOnline] = useState<string[]>([selfMemberId]);
  const [ready, setReady] = useState(false);
  const roomRef = useRef<TeamRoom | null>(null);
  const backendKind = useMemo(() => getRealtimeBackend().kind, []);

  useEffect(() => {
    let active = true;
    const backend = getRealtimeBackend();

    backend
      .joinTeam(teamId, selfMemberId, {
        onGuesses: (next) => {
          if (active) setEdges(next);
        },
        onPresence: (ids) => {
          if (active) setOnline(ids);
        },
      })
      .then((room) => {
        if (!active) {
          room.leave();
          return;
        }
        roomRef.current = room;
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
      roomRef.current?.leave();
      roomRef.current = null;
    };
  }, [teamId, selfMemberId]);

  const teamMembers = useMemo(() => getTeamMembers(teamId), [teamId]);

  const derived = useMemo(
    () => deriveWheel(teamMembers.map((m) => m.id), edges),
    [teamMembers, edges],
  );

  const members: WheelMember[] = useMemo(() => {
    return teamMembers.map((m) => ({
      ...m,
      status: derived.status[m.id] ?? "grey",
      isSelf: m.id === selfMemberId,
      online: online.includes(m.id),
    }));
  }, [teamMembers, derived, selfMemberId, online]);

  const myTargets = useMemo(() => getGuessTargets(selfMemberId), [selfMemberId]);

  const myGuessed = useMemo(() => {
    const mine = new Set(
      edges.filter((e) => e.guesserId === selfMemberId).map((e) => e.guessedId),
    );
    return myTargets.filter((t) => mine.has(t));
  }, [edges, selfMemberId, myTargets]);

  const guess = useCallback(
    async (targetId: string) => {
      await roomRef.current?.guess(selfMemberId, targetId);
    },
    [selfMemberId],
  );

  const reset = useCallback(async () => {
    await roomRef.current?.reset();
  }, []);

  return {
    members,
    online,
    greenCount: derived.greenCount,
    yellowCount: derived.yellowCount,
    total: members.length,
    complete: members.length > 0 && derived.greenCount === members.length,
    ready,
    backendKind,
    myTargets,
    myGuessed,
    guess,
    reset,
  };
}
