"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

export interface Attendee {
  id: string;
  email: string;
  displayName: string | null;
  /** ISO timestamp of their first sign-in. */
  firstSeen: string;
}

export interface AttendeesState {
  attendees: Attendee[];
  loading: boolean;
  error: string | null;
  /** "supabase" when the live sign-in log is reachable; "mock" with no Supabase. */
  backendKind: "supabase" | "mock";
}

interface AttendeeRow {
  id: string;
  email: string;
  display_name: string | null;
  first_seen: string;
}

/*
  Super-admin view of the sign-in log (public.attendees). One row per person,
  written by a trigger the first time they authenticate (see migration 0003).
  RLS only lets a super-admin email read it (migration 0004), so for anyone else
  this just returns an empty list. We snapshot on mount and re-snapshot on any
  realtime change to the table, so a fresh sign-in appears in the dashboard
  without a refresh — the same "re-read on change" approach the wheel uses.
*/
export function useAttendees(): AttendeesState {
  const supabase = useMemo(() => getSupabase(), []);
  const backendKind: "supabase" | "mock" = supabase ? "supabase" : "mock";
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return; // no live log; `loading` already initialised to false
    let active = true;

    const load = async () => {
      const { data, error: err } = await supabase
        .from("attendees")
        .select("id, email, display_name, first_seen")
        .order("first_seen", { ascending: false });
      if (!active) return;
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as AttendeeRow[];
      setAttendees(
        rows.map((r) => ({
          id: r.id,
          email: r.email,
          displayName: r.display_name,
          firstSeen: r.first_seen,
        })),
      );
      setError(null);
      setLoading(false);
    };

    void load();
    // Live: re-snapshot whenever a row changes (new sign-ins INSERT here).
    const channel = supabase
      .channel("attendees:admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendees" },
        () => void load(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  return { attendees, loading, error, backendKind };
}
