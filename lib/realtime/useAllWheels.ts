"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { teams, getTeamMembers } from "@/lib/data/config";
import { deriveWheel } from "./derive";
import { getRealtimeBackend } from "./index";
import type { GuessEdge, TeamRoom } from "./types";

export interface TeamProgress {
  teamId: string;
  name: string;
  color: string;
  greenCount: number;
  yellowCount: number;
  total: number;
  online: number;
  complete: boolean;
}

/*
  Super-admin view: joins EVERY team's realtime room at once and reports each
  team's live progress (green / pending canisters, who's online, complete?).
  Reuses the same derivation as the player wheel, so it can't disagree on state.
  Also exposes a per-team reset so a tester can re-run a wheel from the dashboard.
*/
export function useAllWheels(selfId: string): {
  teams: TeamProgress[];
  backendKind: "supabase" | "mock";
  resetTeam: (teamId: string) => void;
} {
  const [edgesByTeam, setEdgesByTeam] = useState<Record<string, GuessEdge[]>>({});
  const [onlineByTeam, setOnlineByTeam] = useState<Record<string, string[]>>({});
  const roomsRef = useRef<Record<string, TeamRoom>>({});
  const backendKind = useMemo(() => getRealtimeBackend().kind, []);

  useEffect(() => {
    let active = true;
    const backend = getRealtimeBackend();
    const rooms: TeamRoom[] = [];

    for (const team of teams) {
      backend
        .joinTeam(team.id, selfId, {
          onGuesses: (edges) => {
            if (!active) return;
            setEdgesByTeam((prev) => ({ ...prev, [team.id]: edges }));
          },
          onPresence: (ids) => {
            if (!active) return;
            setOnlineByTeam((prev) => ({ ...prev, [team.id]: ids }));
          },
        })
        .then((room) => {
          if (!active) {
            room.leave();
            return;
          }
          rooms.push(room);
          roomsRef.current[team.id] = room;
        })
        .catch(() => {});
    }

    return () => {
      active = false;
      rooms.forEach((r) => r.leave());
      roomsRef.current = {};
    };
  }, [selfId]);

  const resetTeam = useCallback((teamId: string) => {
    void roomsRef.current[teamId]?.reset();
  }, []);

  const progress = useMemo<TeamProgress[]>(() => {
    return teams.map((team) => {
      const members = getTeamMembers(team.id);
      const ids = members.map((m) => m.id);
      const idSet = new Set(ids);
      const { greenCount, yellowCount } = deriveWheel(ids, edgesByTeam[team.id] ?? []);
      // Exclude the admin's own presence key — count only real team members.
      const online = (onlineByTeam[team.id] ?? []).filter((id) => idSet.has(id)).length;
      return {
        teamId: team.id,
        name: team.name,
        color: team.color,
        greenCount,
        yellowCount,
        total: members.length,
        online,
        complete: members.length > 0 && greenCount === members.length,
      };
    });
  }, [edgesByTeam, onlineByTeam]);

  return { teams: progress, backendKind, resetTeam };
}
