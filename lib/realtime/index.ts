import { supabaseEnabled } from "@/lib/supabase/client";
import { MockRealtimeBackend } from "./mockBackend";
import { SupabaseRealtimeBackend } from "./supabaseBackend";
import type { RealtimeBackend } from "./types";

/*
  Picks the realtime transport. The moment Supabase env vars are present the
  app uses the real, cross-device backend; until then it falls back to the
  local cross-tab mock. No code changes needed to flip between them.
*/
export function getRealtimeBackend(): RealtimeBackend {
  return supabaseEnabled ? new SupabaseRealtimeBackend() : new MockRealtimeBackend();
}

export type { GuessEdge, RealtimeBackend, TeamRoom } from "./types";
