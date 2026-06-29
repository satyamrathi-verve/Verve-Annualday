"use client";

import { getTeams, getTeamMembers, getRosterSorted } from "@/lib/data/config";
import { clsx } from "@/lib/clsx";

/** Presence of a member id in the map = that player is "done". */
export interface MemberStatus {
  /** Short status label (defaults to "done"). */
  label?: string;
  /** If set, the status renders as a clickable link (e.g. the Vercel URL). */
  href?: string;
}

interface Group {
  id: string;
  name: string;
  color: string;
  members: { id: string; displayName: string }[];
}

/*
  Reusable per-activity status dashboard for the super admin: every (non-demo)
  team as a card, plus an "Unplaced" card for roster members not on a team (they
  can still do the activity), each player marked done/pending, with per-team
  completion bars and overall totals. Activity 1 passes submission links;
  Activity 2 passes an empty map + a note until its tasks are defined.
*/
export function ActivityStatusBoard({
  doneByMember,
  pendingNote,
}: {
  doneByMember: Map<string, MemberStatus>;
  pendingNote?: string;
}) {
  const teams = getTeams().filter((t) => t.id !== "demo");
  const unplaced = getRosterSorted().filter((m) => !m.teamId);

  const groups: Group[] = [
    ...teams.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      members: getTeamMembers(t.id),
    })),
    ...(unplaced.length
      ? [{ id: "__unplaced__", name: "Unplaced", color: "#9aa4b2", members: unplaced }]
      : []),
  ];

  const allMembers = groups.flatMap((g) => g.members);
  const total = allMembers.length;
  const totalDone = allMembers.filter((m) => doneByMember.has(m.id)).length;
  const teamsComplete = teams.filter((t) => {
    const ms = getTeamMembers(t.id);
    return ms.length > 0 && ms.every((m) => doneByMember.has(m.id));
  }).length;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="done" value={`${totalDone} / ${total}`} />
        <Stat label="pending" value={String(total - totalDone)} />
        <Stat label="teams complete" value={`${teamsComplete} / ${teams.length}`} />
      </div>

      {pendingNote && (
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-faint">{pendingNote}</p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {groups.map((g) => {
          const done = g.members.filter((m) => doneByMember.has(m.id)).length;
          const pct = g.members.length ? Math.round((done / g.members.length) * 100) : 0;
          return (
            <div key={g.id} className="rounded-xl border border-line/70 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                <span className="font-display text-sm font-bold text-navy">{g.name}</span>
                <span className="ml-auto font-mono text-[11px] text-faint">
                  {done}/{g.members.length}
                </span>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-node-live transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-2.5 flex flex-col gap-1">
                {g.members.map((m) => (
                  <MemberRow key={m.id} name={m.displayName} status={doneByMember.get(m.id)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MemberRow({ name, status }: { name: string; status?: MemberStatus }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span
        className={clsx("h-1.5 w-1.5 flex-none rounded-full", status ? "bg-node-live" : "bg-line")}
      />
      <span className={clsx("truncate", status ? "text-navy" : "text-faint")}>{name}</span>
      {status?.href ? (
        <a
          href={status.href}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto max-w-[55%] truncate font-mono text-[11px] text-verve hover:underline"
        >
          {status.label ?? "view →"}
        </a>
      ) : (
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-faint">
          {status ? status.label ?? "done" : "—"}
        </span>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line/60 bg-white/[0.02] px-3 py-2 text-center">
      <div className="font-display text-lg font-extrabold text-navy">{value}</div>
      <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-gold-deep">
        {label}
      </div>
    </div>
  );
}
