"use client";

import { useState } from "react";
import { useVideos, setVideoUrl } from "@/lib/data/videos";

/*
  Super-admin Videos manager: paste/swap the URL for each video slot. Files live
  in Supabase Storage (public "videos" bucket) or any CDN — only the URL is stored
  here, so swapping a clip is instant and needs no redeploy. Screens read these
  URLs live.
*/

const SLOTS: { key: string; label: string; where: string }[] = [
  { key: "briefing", label: "Briefing", where: "Before the wheel · “Top secret · do not forward”" },
  { key: "bridge1", label: "Bridge 1", where: "After the wheel → Activity 1" },
  { key: "bridge2", label: "Bridge 2", where: "After Activity 1 → Activity 2" },
  { key: "bridge3", label: "Bridge 3", where: "Closing · after Activity 2" },
];

export function VideosAdmin() {
  const { videos, ready } = useVideos();

  if (!ready) {
    return (
      <p className="mt-8 text-center font-mono text-[12px] tracking-wider text-faint">
        loading videos…
      </p>
    );
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-3xl">
      <div className="surface-card rounded-2xl p-4">
        <p className="font-mono text-[11px] leading-relaxed text-muted">
          Host each clip in Supabase Storage (public <span className="text-navy">videos</span> bucket)
          or any CDN, then paste its public URL here. Changes go live instantly — no redeploy.
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {SLOTS.map((slot) => (
          <VideoRow key={slot.key} slotKey={slot.key} label={slot.label} where={slot.where} current={videos[slot.key] ?? ""} />
        ))}
      </div>
    </div>
  );
}

function VideoRow({
  slotKey,
  label,
  where,
  current,
}: {
  slotKey: string;
  label: string;
  where: string;
  current: string;
}) {
  const [url, setUrl] = useState(current);
  const [touched, setTouched] = useState(false);
  const value = touched ? url : current || url;
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  const dirty = value.trim() !== (current ?? "").trim();

  const save = async () => {
    setState("saving");
    setErr(null);
    try {
      await setVideoUrl(slotKey, value.trim());
      setState("saved");
      setTimeout(() => setState("idle"), 1600);
    } catch (e) {
      setErr((e as Error).message);
      setState("error");
    }
  };

  return (
    <div className="surface-card rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-sm font-bold text-navy">{label}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-faint">{where}</span>
        <span
          className={`ml-auto h-2 w-2 rounded-full ${current ? "bg-node-live" : "bg-line"}`}
          title={current ? "set" : "empty"}
        />
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          inputMode="url"
          value={value}
          onChange={(e) => {
            setTouched(true);
            setUrl(e.target.value);
          }}
          placeholder="https://<project>.supabase.co/storage/v1/object/public/videos/clip.mp4"
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
      <div className="mt-2 flex items-center gap-3">
        {state === "saved" && <span className="font-mono text-[11px] text-node-live">✓ saved</span>}
        {state === "error" && (
          <span className="font-mono text-[11px] text-red-400">{err ?? "couldn't save"}</span>
        )}
        {current && (
          <a
            href={current}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto font-mono text-[11px] text-verve hover:underline"
          >
            test ▶
          </a>
        )}
      </div>
    </div>
  );
}
