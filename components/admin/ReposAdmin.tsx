"use client";

import { useState } from "react";
import { useRepos, setRepo } from "@/lib/data/activity2";
import { getTeams } from "@/lib/data/config";
import { teamEmoji } from "@/lib/data/teamMeta";

/*
  Super-admin editor for each team's Activity 2 GitHub repo. Stored in
  public.activity2_repos (live), overriding the config/activity2.json seed — so the
  host can wire/swap a team's repo mid-event with no redeploy. The clone step on
  the Activity 2 screen and the /api/commits leaderboard both read these.
*/
export function ReposAdmin() {
  const { repos, ready } = useRepos();
  const teams = getTeams();

  if (!ready) {
    return <p className="font-mono text-[11px] tracking-wider text-faint">loading repos…</p>;
  }

  return (
    <div>
      <p className="font-mono text-[11px] leading-relaxed text-muted">
        Paste each team&apos;s repo as <span className="text-navy">owner/repo</span> (or the full
        GitHub URL). Saves live — the clone step + commit board update instantly.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {teams.map((t) => (
          <RepoRow
            key={t.id}
            teamId={t.id}
            label={t.name}
            current={repos[t.id] ?? ""}
          />
        ))}
      </div>
    </div>
  );
}

function RepoRow({ teamId, label, current }: { teamId: string; label: string; current: string }) {
  const [val, setVal] = useState(current);
  const [touched, setTouched] = useState(false);
  const value = touched ? val : current || val;
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  const dirty = value.trim() !== (current ?? "").trim();

  const save = async () => {
    setState("saving");
    setErr(null);
    try {
      await setRepo(teamId, value.trim());
      setState("saved");
      setTimeout(() => setState("idle"), 1600);
    } catch (e) {
      setErr((e as Error).message);
      setState("error");
    }
  };

  return (
    <div className="rounded-xl border border-line/70 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2">
        <span className="text-base leading-none" aria-hidden>
          {teamEmoji(teamId)}
        </span>
        <span className="font-display text-sm font-bold text-navy">{label}</span>
        <span
          className={`ml-auto h-2 w-2 rounded-full ${current ? "bg-node-live" : "bg-line"}`}
          title={current ? "wired" : "not set"}
        />
      </div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setTouched(true);
            setVal(e.target.value);
          }}
          placeholder="owner/repo  (or https://github.com/owner/repo)"
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[12px] text-ink outline-none focus:border-verve-400/60"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || state === "saving"}
          className="flex-none rounded-lg bg-gradient-to-b from-[#F0BE55] to-[#E0A436] px-4 py-2 font-display text-[12px] font-semibold text-[#0e1a33] transition-opacity hover:opacity-95 disabled:opacity-40"
        >
          {state === "saving" ? "Saving…" : "Save"}
        </button>
      </div>
      <div className="mt-1 min-h-[16px]">
        {state === "saved" && <span className="font-mono text-[11px] text-node-live">✓ saved</span>}
        {state === "error" && (
          <span className="font-mono text-[11px] text-red-400">{err ?? "couldn't save"}</span>
        )}
      </div>
    </div>
  );
}
