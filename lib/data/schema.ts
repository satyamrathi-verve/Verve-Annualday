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
  /** Stable id used for realtime writes and (in mock mode) sign-in. */
  id: z.string().min(1),
  /** Verve email — how a Google/email-authed person is matched to the roster. */
  email: z.string().email().optional(),
  displayName: z.string().min(1),
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

export const rumourSchema = z.object({
  emoji: z.string().min(1),
  text: z.string().min(1),
});

export const eventSchema = z.object({
  eventName: z.string(),
  edition: z.string(),
  landing: z.object({
    eyebrow: z.string(),
    title: z.string(),
    tagline: z.string(),
    subtitle: z.string(),
    cta: z.string(),
  }),
  vibe: z.object({
    eyebrows: z.array(z.string().min(1)).min(1),
    reactions: z.array(z.string().min(1)).min(2),
    helper: z.string(),
    minCards: z.number().int().min(1).default(5),
    maxCards: z.number().int().min(1).default(8),
    closeEyebrow: z.string(),
    closeTitle: z.string(),
    closeSubtitle: z.string(),
    cta: z.string(),
    rumours: z.array(rumourSchema).min(1),
  }),
  signIn: z.object({
    eyebrow: z.string(),
    title: z.string(),
    subtitle: z.string(),
    googleLabel: z.string(),
    emailPlaceholder: z.string(),
    sendLabel: z.string(),
    verifyLabel: z.string(),
    codeLabel: z.string(),
    /** Only emails on this domain may sign in (client-side gate). */
    allowedDomain: z.string(),
    domainError: z.string(),
    /** Shown after the code is sent. Use {email} as a placeholder. */
    checkEmail: z.string(),
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
    /** How many teammates each signed-in player is responsible for guessing. */
    guessesPerPlayer: z.number().int().min(1).default(2),
    partDoneTitle: z.string(),
    partDoneSubtitle: z.string(),
    completeTitle: z.string(),
    completeSubtitle: z.string(),
  }),
  /** Super admins see a live all-teams dashboard instead of the funnel. */
  superAdmins: z
    .array(z.object({ name: z.string(), email: z.string().email() }))
    .default([]),
});

export const rosterSchema = z.array(memberSchema).min(1);
export const teamsSchema = z.array(teamSchema).min(1);

export type Clue = z.infer<typeof clueSchema>;
export type Member = z.infer<typeof memberSchema>;
export type Team = z.infer<typeof teamSchema>;
export type EventConfig = z.infer<typeof eventSchema>;
export type Rumour = z.infer<typeof rumourSchema>;
