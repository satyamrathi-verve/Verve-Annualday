"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

/*
  Activity 1 ("About Me") submissions: each player hosts an HTML profile on Vercel
  and submits the link. Submissions are PUBLIC (RLS select=true) so everyone can
  browse everyone's profiles in the gallery; a player may only write their OWN row
  (RLS owns_member, by signed-in email). Backed by public.activity1_submissions.
*/

export interface Submission {
  memberId: string;
  vercelUrl: string;
  updatedAt: string;
}

let channelSeq = 0;

interface Row {
  member_id: string;
  vercel_url: string;
  updated_at: string;
}

const toSub = (r: Row): Submission => ({
  memberId: r.member_id,
  vercelUrl: r.vercel_url,
  updatedAt: r.updated_at,
});

export async function listSubmissions(): Promise<Submission[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("activity1_submissions")
    .select("member_id,vercel_url,updated_at")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[activity1] list failed:", error.message);
    return [];
  }
  return (data ?? []).map((r) => toSub(r as Row));
}

export async function submitProfile(memberId: string, vercelUrl: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase isn't configured.");
  const { error } = await supabase.from("activity1_submissions").upsert(
    { member_id: memberId, vercel_url: vercelUrl, updated_at: new Date().toISOString() },
    { onConflict: "member_id" },
  );
  if (error) throw new Error(error.message);
}

/** Live list of all submissions for the gallery — refreshes as people submit. */
export function useSubmissions(): { submissions: Submission[]; ready: boolean } {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;

    const refresh = async () => {
      const next = await listSubmissions();
      if (!active) return;
      setSubmissions(next);
      setReady(true);
    };

    void refresh();

    const channel = supabase
      .channel(`activity1_submissions:${++channelSeq}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity1_submissions" },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return { submissions, ready };
}
