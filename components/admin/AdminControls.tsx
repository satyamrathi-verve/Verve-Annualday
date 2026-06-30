"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAdminRoster,
  setGuessOpen,
  updateMember,
  type AdminMember,
  type AdminTeam,
  type MemberPatch,
} from "@/lib/data/adminApi";
import { useGuessOpen } from "@/lib/data/settings";
import type { Clue } from "@/lib/data/schema";
import { clsx } from "@/lib/clsx";
import { teamEmoji, teamLabel } from "@/lib/data/teamMeta";

const UNPLACED = "__unplaced__";

/*
  Super-admin control panel: open/close the crew hunt, move people between teams,
  fix emails/names, and write each person's clues (the clue you set for someone
  shows to whoever is assigned to guess them). All writes hit Supabase under the
  admin-only RLS policy.
*/
export function AdminControls() {
  const [data, setData] = useState<{ teams: AdminTeam[]; members: AdminMember[] } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      setData(await fetchAdminRoster());
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Patch one member in local state after a successful write (no full refetch).
  const applyLocal = useCallback((id: string, patch: MemberPatch) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        members: prev.members.map((m) =>
          m.id === id
            ? {
                ...m,
                ...(patch.email !== undefined ? { email: patch.email } : {}),
                ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
                ...(patch.teamId !== undefined ? { teamId: patch.teamId } : {}),
                ...(patch.clues !== undefined ? { clues: patch.clues } : {}),
                ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
              }
            : m,
        ),
      };
    });
  }, []);

  const teams = data?.teams ?? [];
  const members = data?.members ?? [];

  const byTeam = useMemo(() => {
    const map = new Map<string, AdminMember[]>();
    for (const t of teams) map.set(t.id, []);
    map.set(UNPLACED, []);
    for (const m of members) {
      const key = m.teamId && map.has(m.teamId) ? m.teamId : UNPLACED;
      map.get(key)!.push(m);
    }
    for (const list of map.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);
    return map;
  }, [teams, members]);

  const move = useCallback(
    async (id: string, nextTeamId: string | null) => {
      const list = members.filter((m) => (nextTeamId ? m.teamId === nextTeamId : !m.teamId));
      const nextOrder = list.reduce((max, m) => Math.max(max, m.sortOrder), -1) + 1;
      const patch: MemberPatch = { teamId: nextTeamId, sortOrder: nextOrder };
      await updateMember(id, patch);
      applyLocal(id, patch);
    },
    [members, applyLocal],
  );

  if (loadError) {
    return (
      <div className="surface-card mx-auto mt-6 max-w-2xl rounded-2xl p-6 text-center">
        <p className="font-display text-lg font-bold text-navy">Couldn&apos;t load the roster.</p>
        <p className="mt-2 font-mono text-[12px] leading-relaxed text-muted">{loadError}</p>
        <p className="mt-3 font-mono text-[11px] text-faint">
          If this says a table is missing, run migrations 0004 + 0005 in Supabase first.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-lg border border-verve-400/40 px-4 py-2 font-mono text-[11px] tracking-wider text-verve hover:bg-white/5"
        >
          ↻ retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="mt-8 text-center font-mono text-[12px] tracking-wider text-faint">
        loading roster…
      </p>
    );
  }

  const teamName = (id: string | null) => teams.find((t) => t.id === id)?.name ?? "Unplaced";
  const unplaced = byTeam.get(UNPLACED) ?? [];

  return (
    <div className="mx-auto mt-6 w-full max-w-6xl">
      <OpenToggle />

      {unplaced.length > 0 && (
        <TeamGroup
          key={UNPLACED}
          title="Unplaced"
          emoji="🧩"
          note="Not on a crew yet — pick a team to place them."
          members={unplaced}
          teams={teams}
          teamName={teamName}
          onMove={move}
          onSaved={applyLocal}
        />
      )}

      {teams.map((t) => (
        <TeamGroup
          key={t.id}
          title={teamLabel(t.id, t.name)}
          emoji={teamEmoji(t.id)}
          members={byTeam.get(t.id) ?? []}
          teams={teams}
          teamName={teamName}
          onMove={move}
          onSaved={applyLocal}
        />
      ))}
    </div>
  );
}

/* ---- open/close toggle ------------------------------------------------- */

function OpenToggle() {
  const { open } = useGuessOpen();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const flip = async () => {
    setBusy(true);
    setErr(null);
    try {
      await setGuessOpen(!open);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface-card flex flex-wrap items-center gap-4 rounded-2xl p-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-deep">
          Crew-guessing page
        </p>
        <p className="mt-1 font-display text-xl font-bold text-navy">
          {open ? "Open to players" : "Closed"}
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted">
          {open
            ? "Players can enter the wheel from the wait screen."
            : "Players are held on “Now We Wait” until you open it."}
        </p>
        {err && <p className="mt-1 font-mono text-[11px] text-red-400">{err}</p>}
      </div>
      <button
        type="button"
        onClick={() => void flip()}
        disabled={busy}
        aria-pressed={open}
        className={clsx(
          "ml-auto relative h-9 w-16 flex-none rounded-full transition-colors disabled:opacity-50",
          open ? "bg-node-live/80" : "bg-line",
        )}
      >
        <span
          className={clsx(
            "absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all",
            open ? "left-8" : "left-1",
          )}
        />
      </button>
    </div>
  );
}

/* ---- a team (or the unplaced bucket) ----------------------------------- */

function TeamGroup({
  title,
  emoji,
  note,
  members,
  teams,
  teamName,
  onMove,
  onSaved,
}: {
  title: string;
  emoji: string;
  note?: string;
  members: AdminMember[];
  teams: AdminTeam[];
  teamName: (id: string | null) => string;
  onMove: (id: string, teamId: string | null) => Promise<void>;
  onSaved: (id: string, patch: MemberPatch) => void;
}) {
  return (
    <div className="surface-card mt-4 rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <span className="text-base leading-none" aria-hidden>{emoji}</span>
        <h3 className="font-display text-base font-bold text-navy">{title}</h3>
        <span className="ml-auto font-mono text-[11px] text-faint">{members.length}</span>
      </div>
      {note && <p className="mt-1 font-mono text-[11px] text-muted">{note}</p>}
      <div className="mt-4 flex flex-col gap-3">
        {members.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            teams={teams}
            teamName={teamName}
            onMove={onMove}
            onSaved={onSaved}
          />
        ))}
      </div>
    </div>
  );
}

/* ---- one member ------------------------------------------------------- */

type SaveState = "idle" | "saving" | "saved" | "error";

function MemberRow({
  member,
  teams,
  teamName,
  onMove,
  onSaved,
}: {
  member: AdminMember;
  teams: AdminTeam[];
  teamName: (id: string | null) => string;
  onMove: (id: string, teamId: string | null) => Promise<void>;
  onSaved: (id: string, patch: MemberPatch) => void;
}) {
  const [name, setName] = useState(member.displayName);
  const [email, setEmail] = useState(member.email ?? "");
  const [clue, setClue] = useState(member.clues.clue ?? "");
  const [openClue, setOpenClue] = useState(false);
  const [state, setState] = useState<SaveState>("idle");
  const [err, setErr] = useState<string | null>(null);

  const dirty =
    name !== member.displayName ||
    email !== (member.email ?? "") ||
    clue !== (member.clues.clue ?? "");

  const save = async () => {
    setState("saving");
    setErr(null);
    // Keep legacy arrays as-is; the single free-text clue is what admins edit.
    const clues: Clue = { ...member.clues, clue: clue.trim() };
    const patch: MemberPatch = {
      displayName: name.trim() || member.displayName,
      email: email.trim() || null,
      clues,
    };
    try {
      await updateMember(member.id, patch);
      onSaved(member.id, patch);
      setState("saved");
      setTimeout(() => setState("idle"), 1500);
    } catch (e) {
      setErr((e as Error).message);
      setState("error");
    }
  };

  const hasClue = Boolean((member.clues.clue ?? "").trim());
  const firstName = member.displayName.split(" ")[0];

  return (
    <div className="rounded-xl border border-line/70 bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-[8rem] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-verve-400/60"
          placeholder="Display name"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-[12rem] flex-1 rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[12px] text-ink outline-none focus:border-verve-400/60"
          placeholder="email@verveadvisory.com"
        />
        <select
          value={member.teamId ?? UNPLACED}
          onChange={(e) => {
            const v = e.target.value;
            void onMove(member.id, v === UNPLACED ? null : v);
          }}
          className="rounded-lg border border-line bg-surface px-2 py-2 text-[12px] text-ink outline-none focus:border-verve-400/60"
          title="Move to team"
        >
          <option value={UNPLACED}>Unplaced</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {teamLabel(t.id, t.name)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setOpenClue((o) => !o)}
          className="rounded-lg border border-line px-3 py-2 font-mono text-[11px] tracking-wider text-muted hover:border-gold/50 hover:text-gold-deep"
        >
          clue{hasClue ? " ✓" : ""} {openClue ? "▴" : "▾"}
        </button>
      </div>

      {openClue && (
        <div className="mt-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-deep">
            Clue
          </span>
          <textarea
            value={clue}
            onChange={(e) => setClue(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[14px] leading-relaxed text-ink outline-none focus:border-verve-400/60"
            placeholder={`A hint that points to ${firstName}…`}
          />
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-faint">
            Shown to whoever has to guess {firstName}.
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || state === "saving"}
          className="rounded-lg bg-gradient-to-b from-[#F0BE55] to-[#E0A436] px-4 py-2 font-display text-[12px] font-semibold text-[#0e1a33] transition-opacity hover:opacity-95 disabled:opacity-40"
        >
          {state === "saving" ? "Saving…" : "Save"}
        </button>
        {state === "saved" && (
          <span className="font-mono text-[11px] text-node-live">✓ saved</span>
        )}
        {state === "error" && (
          <span className="font-mono text-[11px] text-red-400">{err ?? "save failed"}</span>
        )}
        <span className="ml-auto font-mono text-[10px] text-faint">{member.id}</span>
      </div>
    </div>
  );
}

