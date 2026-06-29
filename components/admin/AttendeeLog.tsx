"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAttendees, type Attendee } from "@/lib/data/adminApi";

/*
  Super-admin "who's logged in" log. Lists everyone who has signed into the
  portal, newest first — each row is that person's FIRST sign-in (captured by the
  auth.users trigger from migration 0003). Reading it needs migration 0006's
  admin-only SELECT policy.
*/
export function AttendeeLog() {
  const [rows, setRows] = useState<Attendee[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setErr(null);
      setRows(await fetchAttendees());
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
  };

  const downloadCsv = () => {
    const data = rows ?? [];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const head = ["#", "Name", "Email", "First seen"];
    const body = data.map((a, i) =>
      [String(i + 1), a.displayName ?? "", a.email, fmt(a.firstSeen)].map(esc).join(","),
    );
    // BOM so Excel reads UTF-8 names correctly.
    const csv = "﻿" + [head.map(esc).join(","), ...body].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sign-ins-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (err) {
    return (
      <div className="surface-card mx-auto mt-6 max-w-2xl rounded-2xl p-6 text-center">
        <p className="font-display text-lg font-bold text-navy">Couldn&apos;t load sign-ins.</p>
        <p className="mt-2 font-mono text-[12px] leading-relaxed text-muted">{err}</p>
        <p className="mt-3 font-mono text-[11px] text-faint">
          If this mentions permission/policy, run migration 0006 in Supabase first.
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

  if (!rows) {
    return (
      <p className="mt-8 text-center font-mono text-[12px] tracking-wider text-faint">
        loading sign-ins…
      </p>
    );
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-4xl">
      <div className="surface-card rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-base font-bold text-navy">Logged into the portal</h3>
          <span className="font-mono text-[11px] text-faint">{rows.length} total</span>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={rows.length === 0}
            className="ml-auto rounded-lg border border-verve-400/40 px-3 py-1.5 font-mono text-[11px] tracking-wider text-verve transition-colors hover:bg-white/5 disabled:opacity-40"
          >
            ↓ download csv
          </button>
        </div>
        <p className="mt-1 font-mono text-[11px] text-muted">
          Each person&apos;s first sign-in, most recent first.
        </p>

        {rows.length === 0 ? (
          <p className="mt-6 text-center font-mono text-[12px] text-faint">
            No one has signed in yet.
          </p>
        ) : (
          <div className="mt-4 flex flex-col divide-y divide-line/60">
            {rows.map((a, i) => (
              <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <span className="font-mono text-[11px] text-faint">{i + 1}</span>
                <span className="font-display text-sm font-semibold text-navy">
                  {a.displayName || a.email.split("@")[0]}
                </span>
                <span className="font-mono text-[12px] text-muted">{a.email}</span>
                <span className="ml-auto font-mono text-[11px] text-faint">{fmt(a.firstSeen)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
