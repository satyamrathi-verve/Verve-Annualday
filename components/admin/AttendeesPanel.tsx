"use client";

import { AnimatePresence, motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { downloadCsv, toCsv } from "@/lib/admin/csv";
import { useAttendees, type Attendee } from "@/lib/admin/useAttendees";

/*
  Sign-ins panel — the super admin's "who's in the portal" view. Lists everyone
  who has logged in (live, via the attendees sign-in log) and exports the list
  as CSV. Game-day team progress lives in the sibling "Live progress" tab.
*/
export function AttendeesPanel() {
  const { attendees, loading, error, backendKind } = useAttendees();
  const live = backendKind === "supabase";

  const handleDownload = () => {
    const rows = attendees.map((a) => [nameFor(a), a.email, a.firstSeen]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`verve-signins-${stamp}.csv`, toCsv(["Name", "Email", "First seen"], rows));
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* summary + export */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <GlassCard className="px-5 py-4">
          <div className="flex items-center gap-4">
            <span className="font-display text-4xl font-extrabold leading-none text-navy sm:text-5xl">
              {attendees.length}
            </span>
            <div className="leading-tight">
              <p className="font-display text-sm font-bold text-navy">
                {attendees.length === 1 ? "person has signed in" : "people have signed in"}
              </p>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-widest text-gold-deep">
                portal sign-in log
              </p>
            </div>
          </div>
        </GlassCard>

        <motion.button
          type="button"
          onClick={handleDownload}
          disabled={attendees.length === 0}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-4 font-display text-[15px] font-semibold text-[#0e1a33] shadow-[0_16px_34px_-14px_rgba(224,164,54,0.7)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-gold)_82%,white)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          ↓ Download CSV
        </motion.button>
      </div>

      {/* the list */}
      <div className="mt-5">
        {loading ? (
          <p className="px-1 py-6 font-mono text-[12px] uppercase tracking-[0.25em] text-faint">
            loading sign-ins…
          </p>
        ) : error ? (
          <GlassCard className="px-5 py-6">
            <p className="font-display text-sm font-bold text-navy">Couldn&apos;t load the log.</p>
            <p className="mt-1 font-mono text-[12px] text-muted">{error}</p>
          </GlassCard>
        ) : attendees.length === 0 ? (
          <GlassCard className="px-5 py-10 text-center">
            <p className="font-display text-base font-bold text-navy">No one&apos;s knocked yet.</p>
            <p className="mx-auto mt-2 max-w-md font-mono text-[12px] leading-relaxed text-muted">
              {live
                ? "The moment someone signs into the portal, they'll appear here — live."
                : "Connect Supabase to stream the live sign-in log. (Running on the local demo backend.)"}
            </p>
          </GlassCard>
        ) : (
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {attendees.map((a, i) => (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{
                    duration: 0.35,
                    delay: Math.min(i * 0.025, 0.5),
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface/70 px-4 py-3"
                >
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-verve-soft font-mono text-[12px] font-bold text-verve-glow">
                    {initials(nameFor(a))}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold text-navy">
                      {nameFor(a)}
                    </p>
                    <p className="truncate font-mono text-[11px] text-faint">{a.email}</p>
                  </div>
                  <span className="ml-auto flex-none text-right font-mono text-[11px] text-muted">
                    {formatWhen(a.firstSeen)}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}

/** Prefer the Google profile name; fall back to a Title-cased email local part. */
function nameFor(a: Attendee): string {
  if (a.displayName && a.displayName.trim()) return a.displayName.trim();
  const local = a.email.split("@")[0] ?? a.email;
  const words = local
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  return words.join(" ") || a.email;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0]!.charAt(0) + (parts[1]?.charAt(0) ?? "")).toUpperCase();
}

/** Short, human "when": time today, otherwise date + time. */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `today · ${time}`;
  const date = d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `${date} · ${time}`;
}
