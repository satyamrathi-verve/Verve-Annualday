"use client";

import { useEffect, useMemo, useState } from "react";
import { teams, getTeamMembers } from "@/lib/data/config";
import { deriveWheel } from "./derive";
import { getRealtimeBackend } from "./index";
import type { GuessEdge } from "./types";

export interface TeamStanding {
  teamId: string;
  name: string;
  color: string;
  greenCount: number;
  yellowCount: number;
  total: number;
  complete: boolean;
}

/*
  Read-only standings for EVERY team, refreshed on a poll. Uses backend.readTeam
  (a plain fetch — no channel, no presence) so a player can watch other crews'
  progress without joining their rooms and inflating their "in the room" counts.
  Light: a few dozen rows per team, polled every few seconds.
*/
export function useTeamsProgress(intervalMs = 6000): TeamStanding[] {
  const [edgesByTeam, setEdgesByTeam] = useState<Record<string, GuessEdge[]>>({});

  useEffect(() => {
    let active = true;
    const backend = getRealtimeBackend();

    const refresh = async () => {
      const results = await Promise.all(
        teams.map(async (t) => [t.id, await backend.readTeam(t.id)] as const),
      );
      if (active) setEdgesByTeam(Object.fromEntries(results));
    };

    void refresh();
    const id = setInterval(refresh, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return useMemo(
    () =>
      teams.map((t) => {
        const ids = getTeamMembers(t.id).map((m) => m.id);
        const { greenCount, yellowCount } = deriveWheel(ids, edgesByTeam[t.id] ?? []);
        return {
          teamId: t.id,
          name: t.name,
          color: t.color,
          greenCount,
          yellowCount,
          total: ids.length,
          complete: ids.length > 0 && greenCount === ids.length,
        };
      }),
    [edgesByTeam],
  );
}
