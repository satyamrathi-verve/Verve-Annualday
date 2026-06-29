"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

/*
  Live "is the crew-guessing page open?" flag, backed by public.app_settings
  (single row, id = 1). The super admin flips it from the control panel; players
  sitting on the "Now We Wait" screen see it open the instant it changes.

  Fail-OPEN: if Supabase isn't configured, or the settings table doesn't exist
  yet (migration not run), we leave the wheel OPEN so local/mock demos and the
  pre-toggle app keep working. Once the row exists, its value governs.
*/
export function useGuessOpen(): { open: boolean; ready: boolean } {
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;

    const read = async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("guess_page_open")
        .eq("id", 1)
        .maybeSingle();
      if (!active) return;
      // Only a SUCCESSFUL read can lock the wheel; errors (missing table) leave it open.
      if (!error && data) setOpen(Boolean(data.guess_page_open));
      setReady(true);
    };

    void read();

    const channel = supabase
      .channel("app_settings:1")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "id=eq.1" },
        (payload) => {
          if (!active) return;
          const next = (payload.new as { guess_page_open?: boolean } | null)?.guess_page_open;
          if (typeof next === "boolean") setOpen(next);
          else void read();
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return { open, ready };
}
