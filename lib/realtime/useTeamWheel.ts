"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getTeamMembers } from "@/lib/data/config";
import type { Member } from "@/lib/data/schema";
import { getRealtimeBackend } from "./index";
import type { CanisterState, LitMethod, TeamRoom } from "./types";

export interface WheelMember extends Member {
  lit: boolean;
  method: LitMethod | null;
  litBy: string | null;
  isSelf: boolean;
  online: boolean;
}

export interface TeamWheel {
  members: WheelMember[];
  online: string[];
  litCount: number;
  total: number;
  complete: boolean;
  ready: boolean;
  backendKind: "supabase" | "mock";
  light: (memberId: string, method: LitMethod) => Promise<void>;
  reset: () => Promise<void>;
}

/*
  Joins the team's realtime room, auto-lights the player's own canister
  ("self" — you know who you are), and merges the live lit-state onto the
  roster. Because every correct guess by ANY teammate lights the shared
  wheel, the work is parallel and no single person can block the rest.
*/
export function useTeamWheel(teamId: string, selfMemberId: string): TeamWheel {
  const [litMap, setLitMap] = useState<Record<string, CanisterState>>({});
  const [online, setOnline] = useState<string[]>([selfMemberId]);
  const [ready, setReady] = useState(false);
  const roomRef = useRef<TeamRoom | null>(null);
  const backendKind = useMemo(() => getRealtimeBackend().kind, []);

  useEffect(() => {
    let active = true;
    const backend = getRealtimeBackend();

    backend
      .joinTeam(teamId, selfMemberId, {
        onCanisters: (states) => {
          if (!active) return;
          const next: Record<string, CanisterState> = {};
          for (const s of states) next[s.memberId] = s;
          setLitMap(next);
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
        // You know yourself — light your own canister.
        void room.light(selfMemberId, "self", selfMemberId);
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

  const members: WheelMember[] = useMemo(() => {
    return getTeamMembers(teamId).map((m) => {
      const state = litMap[m.id];
      const isSelf = m.id === selfMemberId;
      const lit = state?.lit ?? isSelf;
      return {
        ...m,
        lit,
        method: state?.method ?? (isSelf ? "self" : null),
        litBy: state?.litBy ?? null,
        isSelf,
        online: online.includes(m.id),
      };
    });
  }, [teamId, selfMemberId, litMap, online]);

  const light = useCallback(
    async (memberId: string, method: LitMethod) => {
      await roomRef.current?.light(memberId, method, selfMemberId);
    },
    [selfMemberId],
  );

  const reset = useCallback(async () => {
    await roomRef.current?.reset();
  }, []);

  const litCount = members.filter((m) => m.lit).length;

  return {
    members,
    online,
    litCount,
    total: members.length,
    complete: members.length > 0 && litCount === members.length,
    ready,
    backendKind,
    light,
    reset,
  };
}
