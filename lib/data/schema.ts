import { z } from "zod";

/*
  Single source of truth for the shape of all config-driven data.
  Roster, teams, and event copy live in /config/*.json and are validated
  against these schemas at load time, so malformed config fails loudly
  (see ./config.ts). No people are hard-coded anywhere else.
*/

export const clueSchema = z.object({
  hobbies: z.array(z.string()).default([]),
  quirks: z.array(z.string()).default([]),
  funFacts: z.array(z.string()).default([]),
});

export const memberSchema = z.object({
  /** Stable id == the (mock) Verve ID used for sign-in and realtime writes. */
  id: z.string().min(1),
  displayName: z.string().min(1),
  /** The person's normal daily working group — teams are deliberately mixed across these. */
  dailyGroup: z.enum(["Finance", "HR", "Operations", "IT"]),
  teamId: z.string().min(1),
  /** Managers get the God-Mode override on the Guess screen. */
  isManager: z.boolean().default(false),
  /** Personal-characteristics clues — human-only / "AI-proof" by design. */
  clues: clueSchema,
});

export const teamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Accent colour for the team's wheel. */
  color: z.string().regex(/^#([0-9a-fA-F]{6})$/),
  memberIds: z.array(z.string().min(1)).min(1),
});

export const vibeQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
});

export const eventSchema = z.object({
  eventName: z.string(),
  edition: z.string(),
  landing: z.object({
    eyebrow: z.string(),
    title: z.string(),
    subtitle: z.string(),
    cta: z.string(),
  }),
  vibe: z.object({
    eyebrow: z.string(),
    title: z.string(),
    subtitle: z.string(),
    questions: z.array(vibeQuestionSchema).min(1),
    cta: z.string(),
  }),
  signIn: z.object({
    eyebrow: z.string(),
    title: z.string(),
    subtitle: z.string(),
    googleLabel: z.string(),
    pickLabel: z.string(),
  }),
  brief: z.object({
    eyebrow: z.string(),
    captain: z.string(),
    title: z.string(),
    videoLabel: z.string(),
    quote: z.string(),
    cta: z.string(),
  }),
  guess: z.object({
    eyebrow: z.string(),
    title: z.string(),
    subtitle: z.string(),
    /** How many other-team names to mix in as distractors per player. */
    distractorCount: z.number().int().min(0).default(6),
    completeTitle: z.string(),
    completeSubtitle: z.string(),
  }),
});

export const rosterSchema = z.array(memberSchema).min(1);
export const teamsSchema = z.array(teamSchema).min(1);

export type Clue = z.infer<typeof clueSchema>;
export type Member = z.infer<typeof memberSchema>;
export type Team = z.infer<typeof teamSchema>;
export type EventConfig = z.infer<typeof eventSchema>;
export type VibeQuestion = z.infer<typeof vibeQuestionSchema>;
