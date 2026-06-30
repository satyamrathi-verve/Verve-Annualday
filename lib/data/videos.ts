"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

/*
  Editable video URLs (public.videos, one row per slot key). The super admin
  pastes/swaps URLs in the Videos tab; screens read them live. Files are hosted
  in Supabase Storage (public "videos" bucket) or any CDN — only the URL lives here.
*/

let channelSeq = 0;

/** Live map of slot key → URL (empty urls omitted). */
export function useVideos(): { videos: Record<string, string>; ready: boolean } {
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;

    const read = async () => {
      const { data, error } = await supabase.from("videos").select("key,url");
      if (!active) return;
      if (!error && data) {
        const map: Record<string, string> = {};
        for (const r of data as { key: string; url: string | null }[]) {
          if (r.url) map[r.key] = r.url;
        }
        setVideos(map);
      }
      setReady(true);
    };

    void read();

    const channel = supabase
      .channel(`videos:${++channelSeq}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, () => void read())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return { videos, ready };
}

/** Admin: set (or clear) a slot's URL. RLS restricts this to super admins. */
export async function setVideoUrl(key: string, url: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase isn't configured.");
  const { error } = await supabase
    .from("videos")
    .upsert({ key, url, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}
