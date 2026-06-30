/*
  Display theming for teams — codename + emoji, keyed by team id. Decouples the
  shown name from the raw DB name (which stays "Team 1" etc.), so we can theme
  without a migration. Applied to team names in the store; emoji is read at each
  display site via teamEmoji(). Edit here to rename / re-emoji.
*/
export interface TeamTheme {
  name: string;
  emoji: string;
}

export const TEAM_THEME: Record<string, TeamTheme> = {
  team1: { name: "Project 1", emoji: "🚀" },
  team2: { name: "Project 2", emoji: "🎲" },
  team3: { name: "Project 3", emoji: "💎" },
  team4: { name: "Project 4", emoji: "🌮" },
  team5: { name: "Project 5", emoji: "🦄" },
  team6: { name: "Project 6", emoji: "🪐" },
  team7: { name: "Project 7", emoji: "🍕" },
  team8: { name: "Project 8", emoji: "🐙" },
  demo: { name: "Project Test", emoji: "🧪" },
};

/** Emoji for a team id (falls back to a neutral marker, e.g. the Unplaced group). */
export function teamEmoji(id: string): string {
  return TEAM_THEME[id]?.emoji ?? "🧩";
}

/** Themed display name for a team id, or the given fallback (e.g. raw DB name). */
export function teamLabel(id: string, fallback: string): string {
  return TEAM_THEME[id]?.name ?? fallback;
}
