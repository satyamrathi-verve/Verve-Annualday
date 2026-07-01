"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useSubmissions } from "@/lib/data/activity1";
import { useAppSettings } from "@/lib/data/settings";
import { getTeams, getTeamMembers } from "@/lib/data/config";
import { teamEmoji, TEST_TEAM_ID } from "@/lib/data/teamMeta";
import { GlassCard } from "@/components/ui/GlassCard";

/*
  Live comparison dashboard of everyone's About-Me pages — one animated wheel per
  team, each member a node that lights up + becomes clickable once they submit.
  Self-contained (reads submissions live), so it can sit at the bottom of Activity
  1 AND on the "browse everyone's links" wait screen before Activity 2.
*/
export function ProfileGallery({ subtitle }: { subtitle?: string }) {
  const { submissions, ready } = useSubmissions();
  const { showTestTeam } = useAppSettings();
  const urlByMember = useMemo(
    () => new Map(submissions.map((s) => [s.memberId, s.vercelUrl])),
    [submissions],
  );
  const count = submissions.length;

  // The test crew (Project 9) is hidden until the super admin flips it on.
  // Unplaced members (no team) are left off the dashboard entirely.
  const teams = getTeams().filter((t) => showTestTeam || t.id !== TEST_TEAM_ID);
  const groups = teams.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    members: getTeamMembers(t.id),
  }));

  return (
    <div>
      <div className="text-center">
        <p className="eyebrow">The gallery · {count} live so far</p>
        <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
          Everyone&apos;s profiles
        </h2>
        <p className="mt-2 text-sm text-muted">
          {subtitle ?? "Tap any lit card to open that person's page."}
        </p>
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
                  aria-label={`${m.displayName}, view profile`}
                  className="grid h-9 w-9 place-items-center rounded-full font-display text-[10px] font-bold text-white transition-transform hover:scale-110"
                  style={{ backgroundColor: group.color, boxShadow: `0 0 12px -1px ${group.color}` }}
                >
                  {initials(m.displayName)}
                </a>
              ) : (
                <div
                  title="not yet"
                  aria-label={`${m.displayName}, not submitted`}
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
