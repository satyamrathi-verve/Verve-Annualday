import type { GuessEdge } from "./types";

/*
  Pure derivation of canister colour from the directed guess graph. Shared by the
  player wheel (useTeamWheel) and the super-admin dashboard (useAllWheels) so the
  two can never disagree on what "green" means.

    grey   — nobody has correctly guessed this person yet
    yellow — someone guessed them, but it isn't mutual yet ("you may be right…")
    green  — two people guessed EACH OTHER, or a manager force-revealed them
*/

export type CanisterStatus = "grey" | "yellow" | "green";

/** Reserved guesser id used by the manager God-Mode override (force a member green). */
export const GODMODE_GUESSER = "__godmode__";

export interface DerivedWheel {
  /** memberId → status, for every member id passed in. */
  status: Record<string, CanisterStatus>;
  greenCount: number;
  yellowCount: number;
}

export function deriveWheel(memberIds: string[], edges: GuessEdge[]): DerivedWheel {
  const ids = new Set(memberIds);

  // guesser → people they guessed, and guessed → people who guessed them.
  const iGuessed = new Map<string, Set<string>>();
  const guessedBy = new Map<string, Set<string>>();
  for (const e of edges) {
    (iGuessed.get(e.guesserId) ?? iGuessed.set(e.guesserId, new Set()).get(e.guesserId)!).add(
      e.guessedId,
    );
    (guessedBy.get(e.guessedId) ?? guessedBy.set(e.guessedId, new Set()).get(e.guessedId)!).add(
      e.guesserId,
    );
  }

  const status: Record<string, CanisterStatus> = {};
  let greenCount = 0;
  let yellowCount = 0;

  for (const id of memberIds) {
    const by = guessedBy.get(id) ?? new Set<string>();
    const godmoded = by.has(GODMODE_GUESSER);

    // Mutual: I guessed someone (a real teammate) who also guessed me back.
    let mutual = false;
    const mine = iGuessed.get(id);
    if (mine) {
      for (const q of mine) {
        if (ids.has(q) && iGuessed.get(q)?.has(id)) {
          mutual = true;
          break;
        }
      }
    }

    if (mutual || godmoded) {
      status[id] = "green";
      greenCount++;
    } else if (by.size > 0) {
      // Guessed by at least one real teammate, but not confirmed yet.
      status[id] = "yellow";
      yellowCount++;
    } else {
      status[id] = "grey";
    }
  }

  return { status, greenCount, yellowCount };
}
