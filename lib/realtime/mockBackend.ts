import { GODMODE_GUESSER } from "./derive";
import type { GuessEdge, RealtimeBackend, TeamRoom, TeamRoomCallbacks } from "./types";

/*
  Local fallback used when Supabase env vars are absent. State persists in
  localStorage and syncs across tabs/windows of the SAME browser via
  BroadcastChannel — enough to demo the live wheel locally (open several tabs as
  different teammates). Cross-device realtime needs the Supabase backend.

  Edges are keyed "guesser>guessed" so the set naturally de-dupes repeats.
*/

const PING_MS = 3500;
const STALE_MS = 9000;

const edgeKey = (guesserId: string, guessedId: string) => `${guesserId}>${guessedId}`;

export class MockRealtimeBackend implements RealtimeBackend {
  readonly kind = "mock" as const;

  async joinTeam(
    teamId: string,
    selfMemberId: string,
    cb: TeamRoomCallbacks,
  ): Promise<TeamRoom> {
    const storageKey = `getaway.guesses.${teamId}`;
    const hasBC = typeof BroadcastChannel !== "undefined";
    const bc = hasBC ? new BroadcastChannel(`getaway.team.${teamId}`) : null;

    const readKeys = (): string[] => {
      if (typeof window === "undefined") return [];
      try {
        return JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[];
      } catch {
        return [];
      }
    };
    const writeKeys = (keys: string[]) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify([...new Set(keys)]));
      }
    };

    const snapshot = () => {
      const edges: GuessEdge[] = readKeys().map((k) => {
        const [guesserId, guessedId] = k.split(">");
        return { guesserId, guessedId };
      });
      cb.onGuesses(edges);
    };

    // --- presence (heartbeat) ---
    const seen = new Map<string, number>();
    const markSeen = (id: string) => seen.set(id, Date.now());
    markSeen(selfMemberId);
    const emitPresence = () => {
      const now = Date.now();
      const online = [...seen.entries()]
        .filter(([, t]) => now - t < STALE_MS)
        .map(([id]) => id);
      if (!online.includes(selfMemberId)) online.push(selfMemberId);
      cb.onPresence?.(online);
    };

    const onMessage = (data: { type: string; memberId?: string }) => {
      if (data.type === "state") {
        snapshot();
      } else if (data.type === "hello" && data.memberId) {
        markSeen(data.memberId);
        bc?.postMessage({ type: "here", memberId: selfMemberId });
        emitPresence();
      } else if ((data.type === "here" || data.type === "ping") && data.memberId) {
        markSeen(data.memberId);
        emitPresence();
      }
    };

    bc?.addEventListener("message", (e) => onMessage(e.data));

    // Cross-tab backup for state when BroadcastChannel is unavailable.
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) snapshot();
    };
    if (typeof window !== "undefined") window.addEventListener("storage", onStorage);

    const pinger = setInterval(() => {
      bc?.postMessage({ type: "ping", memberId: selfMemberId });
      emitPresence();
    }, PING_MS);

    // Announce arrival + initial snapshot.
    bc?.postMessage({ type: "hello", memberId: selfMemberId });
    snapshot();
    emitPresence();

    const addEdge = async (guesserId: string, guessedId: string) => {
      writeKeys([...readKeys(), edgeKey(guesserId, guessedId)]);
      bc?.postMessage({ type: "state" });
      snapshot();
    };

    return {
      guess: (guesserId, guessedId) => addEdge(guesserId, guessedId),
      reveal: (memberId) => addEdge(GODMODE_GUESSER, memberId),
      reset: async () => {
        writeKeys([]);
        bc?.postMessage({ type: "state" });
        snapshot();
      },
      leave: () => {
        clearInterval(pinger);
        if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
        bc?.close();
      },
    };
  }
}
