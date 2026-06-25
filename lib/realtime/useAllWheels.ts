"use client";

import { useEffect, useMemo, useState } from "react";
import { teams, getTeamMembers } from "@/lib/data/config";
import { getRealtimeBackend } from "./index";
import type { TeamRoom } from "./types";

export interface TeamProgress {
  teamId: string;
  name: string;
  color: string;
  litCount: number;
  total: number;
  online: number;
  complete: boolean;
}

/*
  Super-admin view: joins EVERY team's realtime room at once and reports each
  team's live progress (lit canisters, who's online, complete?). Reuses the same
  backend as the player wheel, so it works on Supabase and the local mock alike.
*/
export function useAllWheels(selfId: string): {
  teams: TeamProgress[];
  backendKind: "supabase" | "mock";
} {
  const [litByTeam, setLitByTeam] = useState<Record<string, string[]>>({});
  const [onlineByTeam, setOnlineByTeam] = useState<Record<string, string[]>>({});
  const backendKind = useMemo(() => getRealtimeBackend().kind, []);

  useEffect(() => {
    let active = true;
    const backend = getRealtimeBackend();
    const rooms: TeamRoom[] = [];

    for (const team of teams) {
      backend
        .joinTeam(team.id, selfId, {
          onCanisters: (states) => {
            if (!active) return;
            const lit = states.filter((s) => s.lit).map((s) => s.memberId);
            setLitByTeam((prev) => ({ ...prev, [team.id]: lit }));
          },
          onPresence: (ids) => {
            if (!active) return;
            setOnlineByTeam((prev) => ({ ...prev, [team.id]: ids }));
          },
        })
        .then((room) => {
          if (active) rooms.push(room);
          else room.leave();
        })
        .catch(() => {});
    }

    return () => {
      active = false;
      rooms.forEach((r) => r.leave());
    };
  }, [selfId]);

  const progress = useMemo<TeamProgress[]>(() => {
    return teams.map((team) => {
      const members = getTeamMembers(team.id);
      const ids = new Set(members.map((m) => m.id));
      const litSet = new Set(litByTeam[team.id] ?? []);
      const litCount = members.filter((m) => litSet.has(m.id)).length;
      // Exclude the admin's own presence key — count only real team members.
      const online = (onlineByTeam[team.id] ?? []).filter((id) => ids.has(id)).length;
      return {
        teamId: team.id,
        name: team.name,
        color: team.color,
        litCount,
        total: members.length,
        online,
        complete: members.length > 0 && litCount === members.length,
      };
    });
  }, [litByTeam, onlineByTeam]);

  return { teams: progress, backendKind };
}
