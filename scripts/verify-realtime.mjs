// End-to-end realtime check for the Operation Getaway wheel.
// Subscribes as one client, writes from a second, and confirms the change +
// presence propagate — the exact path the live wheel uses.
//
// Run:  npm run verify:realtime         (loads .env.local)
// Resilient to a brand-new project's first-event cold start: it re-writes a
// fresh row every ~1.5s until the change arrives (or it gives up).
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(2);
}

const TEAM = "__rt_test__";
const opts = { auth: { persistSession: false } };
const sub = createClient(url, key, opts);
const pub = createClient(url, key, opts);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let gotChange = false;
let presenceSynced = false;

const channel = sub.channel(`team:${TEAM}`, { config: { presence: { key: "subscriber" } } });
channel.on(
  "postgres_changes",
  { event: "*", schema: "public", table: "canister_state", filter: `team_id=eq.${TEAM}` },
  (payload) => {
    gotChange = true;
    console.log(`  ✓ realtime event: ${payload.eventType} member=${payload.new?.member_id ?? "?"}`);
  },
);
channel.on("presence", { event: "sync" }, () => {
  if (Object.keys(channel.presenceState()).length >= 1) presenceSynced = true;
});

try {
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("subscribe timed out")), 15000);
    channel.subscribe(async (status, err) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(t);
        await channel.track({ memberId: "subscriber" });
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(t);
        reject(new Error(`subscribe status: ${status}${err ? " — " + err.message : ""}`));
      }
    });
  });
  console.log("  ✓ subscribed to team channel");

  // Re-write until the change lands — tolerates first-event replication warmup.
  for (let i = 1; i <= 8 && !gotChange; i++) {
    await sleep(1500);
    const { error } = await pub.from("canister_state").upsert(
      { team_id: TEAM, member_id: `probe${i}`, lit: true, method: "self", lit_by: "probe" },
      { onConflict: "team_id,member_id" },
    );
    if (error) console.error(`  ✗ upsert ${i} failed: ${error.message}`);
    else console.log(`  · wrote probe${i} (change received: ${gotChange})`);
  }
} catch (e) {
  console.error(`  ✗ ${e.message}`);
} finally {
  await pub.from("canister_state").delete().eq("team_id", TEAM);
  await sub.removeChannel(channel);
}

console.log("\n--- RESULT ---");
console.log(`realtime postgres_changes : ${gotChange ? "PASS" : "FAIL"}`);
console.log(`presence sync             : ${presenceSynced ? "PASS" : "FAIL"}`);
process.exit(gotChange ? 0 : 1);
