"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { getSettingsId } from "@/lib/data/settingsId";

/*
  Live app settings, backed by public.app_settings. The row is chosen by
  getSettingsId() (id=1 live, id=2 test) so the test deployment's toggles are
  isolated from live. Holds the crew-guessing toggle plus each activity's
  open/close flag. The super admin flips them from the control panel; players
  see changes instantly.

  Fail-OPEN for the wheel (so local/mock demos + the pre-toggle app keep working);
  activities default CLOSED until the host opens them.
*/

// supabase-js throws if a topic is re-subscribed once subscribed, and this hook
// mounts in several places at once (Funnel, Wait, admin) + on StrictMode/HMR
// remounts. A per-subscription counter gives every instance its own topic.
let channelSeq = 0;

export interface AppSettings {
  guessOpen: boolean;
  activity1Open: boolean;
  activity2Open: boolean;
  ready: boolean;
}

type SettingsRow = {
  guess_page_open?: boolean;
  activity1_open?: boolean;
  activity2_open?: boolean;
};

export function useAppSettings(): AppSettings {
  const [guessOpen, setGuessOpen] = useState(true);
  const [activity1Open, setActivity1Open] = useState(false);
  const [activity2Open, setActivity2Open] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;
    const settingsId = getSettingsId();

    const apply = (row: SettingsRow | null | undefined) => {
      if (!row) return;
      if (typeof row.guess_page_open === "boolean") setGuessOpen(row.guess_page_open);
      if (typeof row.activity1_open === "boolean") setActivity1Open(row.activity1_open);
      if (typeof row.activity2_open === "boolean") setActivity2Open(row.activity2_open);
    };

    const read = async () => {
      // select * so it works before AND after the 0007 columns exist.
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("id", settingsId)
        .maybeSingle();
      if (!active) return;
      if (!error) apply(data as SettingsRow);
      setReady(true);
    };

    void read();

    const channel = supabase
      .channel(`app_settings:${settingsId}:${++channelSeq}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: `id=eq.${settingsId}` },
        (payload) => {
          if (!active) return;
          const next = payload.new as SettingsRow | null;
          if (next && Object.keys(next).length) apply(next);
          else void read();
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return { guessOpen, activity1Open, activity2Open, ready };
}

/** Back-compat: the crew-guessing page open flag (used by Wait + Funnel). */
export function useGuessOpen(): { open: boolean; ready: boolean } {
  const s = useAppSettings();
  return { open: s.guessOpen, ready: s.ready };
}
