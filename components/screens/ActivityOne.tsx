"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/AuthContext";
import { useSubmissions, submitProfile } from "@/lib/data/activity1";
import { GlassCard } from "@/components/ui/GlassCard";
import { ProfileGallery } from "./ProfileGallery";

/*
  Activity 1 — "About Me". A very detailed, non-coder, step-by-step guide to
  building an HTML profile with VS Code + the Claude Code extension and deploying
  it to Vercel, a box to submit the hosted link, and the live comparison
  dashboard of everyone's profiles at the bottom.
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
      "Open VS Code once it's installed, and you'll see a welcome screen.",
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
    title: "Give Claude the real you 🪪",
    body: [
      "The page is only as good as what Claude knows about you, so feed it your real details.",
      "Open your LinkedIn profile and your résumé. Copy the highlights (your role, experience, skills, achievements) and keep them handy for the next step.",
      "Tip: you can paste your LinkedIn URL and a few lines from your résumé straight into the prompt; Claude will pull the best bits into your page.",
    ],
  },
  {
    title: "Ask Claude Code to build your profile",
    body: [
      "Open Claude Code (click the Claude icon in the left sidebar, or press Cmd/Ctrl+Esc).",
      "Paste the prompt below into Claude Code and fill in your details in the [brackets], including your LinkedIn + résumé highlights from the last step. Hit Enter and let it create an index.html file.",
      "To preview it: in the file list, double-click index.html and it opens in your browser. Don't love it? Just tell Claude ‘make it more colourful’, ‘bigger photo’, ‘add a projects section’, etc., until it looks great.",
    ],
    snippet:
      "Here's the project: I'm building a personal ‘About Me’ web page. It should be one self-contained index.html file (no build tools, everything inline) that I'll put online with Vercel later, so anyone can open it from a link. Please build that page for me: modern, colourful, mobile-friendly. I'm [Your Name], I work in [Your Team] at Verve Advisory. Use this real info about me and pull the best parts in. LinkedIn: [paste your LinkedIn URL]. From my résumé: [paste a few lines: role, experience, key skills, achievements]. Include: a big header with my name and role, a circular photo placeholder, a 2 to 3 line bio, my hobbies ([list]), 3 fun facts ([list]), my favourite quote, and buttons linking to [LinkedIn / Instagram]. Use a nice font and a soft gradient background.",
  },
  {
    title: "Put it online with Vercel (free)",
    body: [
      "First make a free account: open vercel.com → Sign Up → ‘Continue with GitHub’ (or email).",
      "Now the easy part: ask Claude Code to deploy it for you. Paste the prompt below.",
      "A terminal will open. The first time, it asks you to log into Vercel. Press Enter, authorise in the browser, then return. Accept the default answers (just press Enter) for any questions.",
      "When it finishes, it prints a link ending in .vercel.app. That's your live page! Open it to check.",
    ],
    snippet: "Deploy this folder to Vercel and give me the final public https://….vercel.app link.",
  },
  {
    title: "Submit your link",
    body: [
      "Copy your https://….vercel.app link.",
      "Paste it in the box below and hit Submit.",
      "That's it. Your profile joins the gallery, and you can browse everyone else's. 🎉",
    ],
  },
  {
    title: "Keep making it better (until the deadline)",
    body: [
      "You're not locked in. Any time before the deadline, jump back into the same Claude Code chat and keep improving your page.",
      "Try things like: “add a projects section”, “use a nicer font”, “make the colours pop”, “add a little animation”.",
      "When you like it, ask Claude to deploy again. Your live link updates instantly, so there's nothing else to resubmit.",
      "Make it the best page you can. This is your corner of the gallery. ✨",
    ],
  },
];

export function ActivityOne() {
  const { session } = useAuth();
  const { submissions } = useSubmissions();

  const myUrl = useMemo(
    () => submissions.find((s) => s.memberId === session?.memberId)?.vercelUrl ?? "",
    [submissions, session?.memberId],
  );

  return (
    <div className="w-full max-w-5xl">
      <div className="text-center">
        <p className="eyebrow">Activity 1 · for everyone, no coding needed</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl lg:text-5xl">
          Build your <span className="text-gold-deep">About-Me</span> page.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted">
          You&apos;ll make your own little website and put it online, with an AI assistant doing the
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

      {/* Live comparison dashboard */}
      <div className="mt-12">
        <ProfileGallery />
      </div>
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
        {current ? "Your profile is in. Update it anytime." : "Submit your live link"}
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
