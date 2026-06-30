"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/components/providers/AuthContext";
import { useSubmissions, submitProfile } from "@/lib/data/activity1";
import { getTeams, getTeamMembers, getRosterSorted } from "@/lib/data/config";
import { teamEmoji } from "@/lib/data/teamMeta";
import { GlassCard } from "@/components/ui/GlassCard";

/*
  Activity 1 — "About Me". A very detailed, non-coder, step-by-step guide to
  building an HTML profile with VS Code + the Claude Code extension and deploying
  it to Vercel, a box to submit the hosted link, and a live public gallery of
  everyone's profiles (own team + all other teams).
*/

interface GuideStep {
  title: string;
  body: string[];
  /** Optional copy-paste block (e.g. a prompt). */
  snippet?: string;
}

const GUIDE: GuideStep[] = [
  {
    title: "Install VS Code",
    body: [
      "Open code.visualstudio.com in your browser.",
      "Click the big blue Download button for your computer (Windows or Mac).",
      "Open the downloaded file and follow the installer (just keep clicking Next / Continue).",
      "Open VS Code once it's installed — you'll see a welcome screen.",
    ],
  },
  {
    title: "Add the Claude Code extension",
    body: [
      "In VS Code, click the Extensions icon on the left sidebar (it looks like four squares), or press Ctrl+Shift+X (Windows) / Cmd+Shift+X (Mac).",
      "In the search box type: Claude Code",
      "Click Install on the official Anthropic one.",
      "When it asks you to sign in, click Sign in and follow the steps in your browser, then come back to VS Code.",
    ],
  },
  {
    title: "Make a folder for your page",
    body: [
      "In VS Code: top menu → File → Open Folder…",
      "Create a new folder on your Desktop called about-me and open it.",
      "If VS Code asks ‘Do you trust the authors?’, click Yes, I trust.",
    ],
  },
  {
    title: "Ask Claude Code to build your profile",
    body: [
      "Open Claude Code (click the Claude icon in the left sidebar, or press Cmd/Ctrl+Esc).",
      "Paste the prompt below into Claude Code and fill in your details in the [brackets]. Hit Enter and let it create an index.html file.",
      "To preview it: in the file list, double-click index.html — it opens in your browser. Don't love it? Just tell Claude ‘make it more colourful’, ‘bigger photo’, ‘add a projects section’, etc., until it looks great.",
    ],
    snippet:
      "Create a single-file index.html ‘About Me’ page for me — modern, colourful, mobile-friendly, no build tools, everything inline. I'm [Your Name], I work in [Your Team] at Verve Advisory. Include: a big header with my name + role, a circular photo placeholder, a 2-3 line bio, my hobbies ([list]), 3 fun facts ([list]), my favourite quote, and buttons linking to [LinkedIn / Instagram]. Use a nice font and a soft gradient background.",
  },
  {
    title: "Put it online with Vercel (free)",
    body: [
      "First make a free account: open vercel.com → Sign Up → ‘Continue with GitHub’ (or email).",
      "Now the easy part — ask Claude Code to deploy it for you. Paste the prompt below.",
      "A terminal will open. The first time, it asks you to log into Vercel — press Enter, authorise in the browser, then return. Accept the default answers (just press Enter) for any questions.",
      "When it finishes, it prints a link ending in .vercel.app — that's your live page! Open it to check.",
    ],
    snippet: "Deploy this folder to Vercel and give me the final public https://….vercel.app link.",
  },
  {
    title: "Submit your link",
    body: [
      "Copy your https://….vercel.app link.",
      "Paste it in the box below and hit Submit.",
      "That's it — your profile joins the gallery, and you can browse everyone else's. 🎉",
    ],
  },
];

export function ActivityOne() {
  const { session } = useAuth();
  const { submissions, ready } = useSubmissions();

  const myUrl = useMemo(
    () => submissions.find((s) => s.memberId === session?.memberId)?.vercelUrl ?? "",
    [submissions, session?.memberId],
  );
  const urlByMember = useMemo(
    () => new Map(submissions.map((s) => [s.memberId, s.vercelUrl])),
    [submissions],
  );

  return (
    <div className="w-full max-w-5xl">
      <div className="text-center">
        <p className="eyebrow">Activity 1 · for everyone, no coding needed</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl lg:text-5xl">
          Build your <span className="text-gold-deep">About-Me</span> page.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted">
          You&apos;ll make your own little website and put it online — with an AI assistant doing the
          hard parts. Follow the steps, then drop your link below.
        </p>
      </div>

      {/* The guide */}
      <div className="mt-8 grid gap-4">
        {GUIDE.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.2) }}
          >
            <GlassCard className="p-5">
              <div className="flex items-start gap-4">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-gold/15 font-display text-base font-extrabold text-gold-deep">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-bold text-navy">{step.title}</h2>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {step.body.map((line, j) => (
                      <li key={j} className="flex gap-2 text-[15px] leading-relaxed text-body">
                        <span className="mt-2 h-1 w-1 flex-none rounded-full bg-verve-400" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  {step.snippet && <CopyBlock text={step.snippet} />}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Submit */}
      <div className="mt-8">
        {session?.memberId ? (
          <SubmitBox memberId={session.memberId} current={myUrl} />
        ) : (
          <GlassCard accent className="p-5 text-center">
            <p className="text-sm text-muted">
              Sign in with your Verve account to submit your profile.
            </p>
          </GlassCard>
        )}
      </div>

      {/* Gallery */}
      <Gallery ready={ready} urlByMember={urlByMember} count={submissions.length} />
    </div>
  );
}

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked — the text is still selectable */
    }
  };
  return (
    <div className="mt-3 rounded-xl border border-gold/25 bg-gold/[0.06] p-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-deep">
          paste into Claude Code
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="ml-auto rounded-md border border-gold/40 px-2.5 py-1 font-mono text-[10px] tracking-wider text-gold-deep transition-colors hover:bg-gold/10"
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <p className="mt-2 select-all font-mono text-[12px] leading-relaxed text-body">{text}</p>
    </div>
  );
}

function SubmitBox({ memberId, current }: { memberId: string; current: string }) {
  const [url, setUrl] = useState(current);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  // Keep in sync if the live value arrives after mount.
  const [touched, setTouched] = useState(false);
  const value = touched ? url : current || url;

  const valid = /^https?:\/\/.+/i.test(value.trim());

  const save = async () => {
    if (!valid) return;
    setState("saving");
    setErr(null);
    try {
      await submitProfile(memberId, value.trim());
      setState("saved");
      setTimeout(() => setState("idle"), 1800);
    } catch (e) {
      setErr((e as Error).message);
      setState("error");
    }
  };

  return (
    <GlassCard accent className="p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-deep">
        {current ? "Your profile is in — update it anytime" : "Submit your live link"}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="mt-3 flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="url"
          inputMode="url"
          value={value}
          onChange={(e) => {
            setTouched(true);
            setUrl(e.target.value);
          }}
          placeholder="https://your-name.vercel.app"
          className="flex-1 rounded-xl border border-verve-400/30 bg-surface px-4 py-3 font-mono text-sm text-ink outline-none transition placeholder:text-faint focus:border-verve-400/60 focus:ring-1 focus:ring-verve-400/40"
        />
        <button
          type="submit"
          disabled={!valid || state === "saving"}
          className="flex-none whitespace-nowrap rounded-xl bg-gradient-to-b from-[#F0BE55] to-[#E0A436] px-6 py-3 font-display text-sm font-semibold text-[#0e1a33] transition-opacity hover:opacity-95 disabled:opacity-40"
        >
          {state === "saving" ? "Saving…" : current ? "Update" : "Submit"}
        </button>
      </form>
      <div className="mt-2 min-h-[18px]">
        {state === "saved" && <span className="font-mono text-[11px] text-node-live">✓ saved</span>}
        {state === "error" && (
          <span className="font-mono text-[11px] text-red-400">{err ?? "couldn't save"}</span>
        )}
        {state === "idle" && value && !valid && (
          <span className="font-mono text-[11px] text-faint">
            Link should start with https://
          </span>
        )}
      </div>
    </GlassCard>
  );
}

function Gallery({
  ready,
  urlByMember,
  count,
}: {
  ready: boolean;
  urlByMember: Map<string, string>;
  count: number;
}) {
  const teams = getTeams(); // demo team included — active for all activities
  const unplaced = getRosterSorted().filter((m) => !m.teamId);
  const groups = [
    ...teams.map((t) => ({ id: t.id, name: t.name, color: t.color, members: getTeamMembers(t.id) })),
    ...(unplaced.length
      ? [{ id: "__unplaced__", name: "Unplaced", color: "#9aa4b2", members: unplaced }]
      : []),
  ];

  return (
    <div className="mt-12">
      <div className="text-center">
        <p className="eyebrow">The gallery · {count} live so far</p>
        <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
          Everyone&apos;s profiles
        </h2>
        <p className="mt-2 text-sm text-muted">Tap any lit card to open that person&apos;s page.</p>
      </div>

      {!ready ? (
        <p className="mt-8 text-center font-mono text-[12px] tracking-wider text-faint">
          loading the gallery…
        </p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <ProfileWheel key={group.id} group={group} urlByMember={urlByMember} />
          ))}
        </div>
      )}
    </div>
  );
}

/* One team as an animated wheel: members orbit a hub; a submitted member is a
   lit, clickable node (opens their profile), pending members stay dim. */
function ProfileWheel({
  group,
  urlByMember,
}: {
  group: { id: string; name: string; color: string; members: { id: string; displayName: string }[] };
  urlByMember: Map<string, string>;
}) {
  const reduce = useReducedMotion();
  const members = group.members;
  const n = Math.max(members.length, 1);
  const done = members.filter((m) => urlByMember.has(m.id)).length;
  const RADIUS = 40; // % from centre

  const initials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none" aria-hidden>
          {teamEmoji(group.id)}
        </span>
        <h3 className="truncate font-display text-sm font-bold text-navy">{group.name}</h3>
        <span className="ml-auto font-mono text-[10px] text-faint">
          {done}/{members.length}
        </span>
      </div>

      <div className="relative mx-auto mt-3 aspect-square w-full max-w-[230px]">
        {/* decorative slowly-rotating ring */}
        <motion.div
          className="absolute inset-[16%] rounded-full border border-dashed border-white/10"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />

        {/* hub */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div className="flex flex-col items-center">
            <span className="text-2xl" aria-hidden>
              {teamEmoji(group.id)}
            </span>
            <span className="mt-0.5 font-display text-base font-extrabold leading-none text-navy">
              {done}
              <span className="text-[11px] text-faint">/{members.length}</span>
            </span>
            <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-gold-deep">
              live
            </span>
          </div>
        </div>

        {/* member nodes */}
        {members.map((m, i) => {
          const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + RADIUS * Math.cos(ang);
          const y = 50 + RADIUS * Math.sin(ang);
          const url = urlByMember.get(m.id);
          return (
            <motion.div
              key={m.id}
              className="group/node absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{
                delay: Math.min(i * 0.05, 0.6),
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${m.displayName} — view profile`}
                  className="grid h-9 w-9 place-items-center rounded-full font-display text-[10px] font-bold text-white transition-transform hover:scale-110"
                  style={{ backgroundColor: group.color, boxShadow: `0 0 12px -1px ${group.color}` }}
                >
                  {initials(m.displayName)}
                </a>
              ) : (
                <div
                  title="not yet"
                  aria-label={`${m.displayName} — not submitted`}
                  className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white/[0.03] font-display text-[10px] font-bold text-faint"
                >
                  {initials(m.displayName)}
                </div>
              )}
              <span className="pointer-events-none absolute left-1/2 top-[114%] z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-[#0E1525] px-2 py-0.5 font-mono text-[9px] text-ink opacity-0 shadow-lg transition-opacity duration-150 group-hover/node:opacity-100">
                {m.displayName.split(" ")[0]}
                {url ? " · view →" : " · not yet"}
              </span>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}
