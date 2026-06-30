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
  /** Single free-text clue pointing to this person — the primary clue admins
   *  edit; shown to whoever must guess them. (The arrays above are legacy.) */
  clue: z.string().default(""),
});

export const memberSchema = z.object({
  /** Stable id used for realtime writes and (in mock mode) sign-in. */
  id: z.string().min(1),
  /** Verve email — how a Google/email-authed person is matched to the roster. */
  email: z.string().email().optional(),
  displayName: z.string().min(1),
  /** Team the member belongs to. `null` = "unplaced" — exists in the roster but
   *  not yet assigned to a crew (placed via the super-admin panel). */
  teamId: z.string().min(1).nullable(),
  /** Managers get the God-Mode override on the Guess screen. */
  isManager: z.boolean().default(false),
  /**
   * Who THIS member is responsible for guessing. When omitted, the player's
   * targets default to their two "ring neighbours" in the team's declared
   * order, which guarantees every guess is reciprocated (see getGuessTargets).
   * A canister only turns green when two members guess each other.
   */
  guessTargets: z.array(z.string().min(1)).optional(),
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

/* A teaser "question" — emoji, headline, the one-line question, and the
   intrigue body (one or more paragraphs). Shown in the Vibe Check reel. */
export const rumourSchema = z.object({
  emoji: z.string().min(1),
  heading: z.string().min(1),
  sub: z.string().min(1),
  body: z.array(z.string().min(1)).min(1),
});

/* A date-gated "wait for <date>" screen (Task 1 / Task 2). Locked until the host
   flips the matching activity toggle, then flips to an "the wait is over" CTA. */
export const taskGateSchema = z.object({
  lockedEyebrow: z.string().default("Locked"),
  /** e.g. "Wait for 3 July." — edit the date here. */
  lockedTitle: z.string(),
  lockedBody: z.array(z.string().min(1)).min(1),
  openEyebrow: z.string().default("The wait is over."),
  openTitle: z.string(),
  cta: z.string(),
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
    /** Eyebrow shown above every teaser. */
    teaserEyebrow: z.string().default("Maybe it is…"),
    /** Single advance button under each teaser. */
    teaserCta: z.string().default("Or maybe not."),
    /** Closing rhetorical line under each teaser, before the button. */
    closer: z.string().default("Is this what's behind the door?"),
    rumours: z.array(rumourSchema).min(1),
  }),
  signIn: z.object({
    eyebrow: z.string(),
    title: z.string(),
    subtitle: z.string(),
    /** Optional extra paragraphs shown under the subtitle on the Google screen. */
    body: z.array(z.string().min(1)).default([]),
    googleLabel: z.string(),
    emailPlaceholder: z.string(),
    sendLabel: z.string(),
    verifyLabel: z.string(),
    codeLabel: z.string(),
    /** Only emails on this domain may sign in (client-side gate). */
    allowedDomain: z.string(),
    /** Specific non-domain emails also allowed through (external guests). */
    allowedEmails: z.array(z.string()).default([]),
    domainError: z.string(),
    /** Shown after the code is sent. Use {email} as a placeholder. */
    checkEmail: z.string(),
    /** Fine-print line under the Google button. */
    fine: z.string().default("Off the record, naturally. Use your Verve account."),
  }),
  brief: z.object({
    eyebrow: z.string(),
    captain: z.string(),
    title: z.string(),
    videoLabel: z.string(),
    quote: z.string(),
    cta: z.string(),
    /** Optional real briefing clip. When set, the poster swaps to a <video> on play. */
    videoSrc: z.string().optional(),
  }),
  guess: z.object({
    eyebrow: z.string(),
    title: z.string(),
    subtitle: z.string(),
    /**
     * Shown after a correct-but-not-yet-mutual guess (the target turns yellow).
     * Use {name} for the teammate the player just identified.
     */
    pendingNote: z.string(),
    /** Shown when the guess completes a mutual pair (both turn green). {name} = teammate. */
    confirmedNote: z.string(),
    /** Shown on a wrong guess. */
    wrongNote: z.string(),
    partDoneTitle: z.string(),
    partDoneSubtitle: z.string(),
    completeTitle: z.string(),
    completeSubtitle: z.string(),
    /** Loading lines while the secure channel / org chart decrypts. */
    loading: z.array(z.string().min(1)).min(1).default(["Decrypting your crew… don't tell HR."]),
    /** Status-card hint when nothing is lit yet. */
    emptyHint: z.string().default("No canisters lit. Yet. Click a node to begin."),
    /** Status-card hint while the wheel is warming up. */
    clickHint: z.string().default("Click a glowing node to decode it."),
    /** Mono header for the decode bottom sheet. */
    clueSheetTitle: z.string().default("Decode the canister"),
    /** Mutual celebration toast. Use {name} for the teammate who named you back. */
    mutualToast: z.string().default("Mutual! {name} named you back. 🟢"),
    /** Shown if the wheel can't be assembled (no members resolved). */
    errorTitle: z.string().default("Signal lost."),
    errorBody: z
      .string()
      .default("Couldn't assemble this crew's wheel. Refresh — and if it persists, ping the host."),
  }),
  /** "Now We Wait." screen (shown after sign-in); its CTA dives into the game. */
  wait: z.object({
    eyebrow: z.string(),
    emoji: z.string(),
    title: z.string(),
    subtitle: z.string(),
    body: z.array(z.string().min(1)).min(1),
    cta: z.string(),
    /** Locked-state CTA — sends waiting players back to the teasers/whispers reel. */
    whispersCta: z.string().default("See what they're whispering today →"),
    /** Button label shown while the host hasn't opened the crew hunt yet. */
    lockedCta: z.string().default("🔒 The host hasn't opened the wheel yet"),
    /** Helper line shown under the locked button. */
    lockedNote: z
      .string()
      .default("Hang tight — the crew hunt opens any moment. This page lights up the instant the host flips it on."),
    /* "Open" variant — shown on this same screen once the host flips the toggle. */
    openEyebrow: z.string().default("The wait is over."),
    openTitle: z.string().default("The time has arrived."),
    openSubtitle: z.string().default("The door's open — step through and find your crew."),
    openBody: z
      .array(z.string().min(1))
      .min(1)
      .default(["No more rumours. No more waiting. Your crew is right behind the door — go assemble them."]),
  }),
  /** The two date-gated "wait for <date>" screens between the activities. */
  taskGates: z
    .object({
      task1: taskGateSchema,
      task2: taskGateSchema,
    })
    .default({
      task1: {
        lockedEyebrow: "Task 1 · locked",
        lockedTitle: "Wait for 3 July.",
        lockedBody: [
          "Your first task drops on the 3rd. Keep this page open — it lights up the instant the host opens it.",
        ],
        openEyebrow: "The wait is over.",
        openTitle: "Your first task is live.",
        cta: "Continue to Task 1 →",
      },
      task2: {
        lockedEyebrow: "Task 2 · locked",
        lockedTitle: "Wait for 6 July.",
        lockedBody: [
          "Task 2 opens on the 6th. While you wait, explore everyone's profiles below.",
          "This page flips the moment the host opens the next task.",
        ],
        openEyebrow: "The wait is over.",
        openTitle: "Time for the next task.",
        cta: "Move to the next task →",
      },
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
export type TaskGate = z.infer<typeof taskGateSchema>;
