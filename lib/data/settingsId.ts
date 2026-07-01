/*
  Which app_settings row this deployment reads/writes: id=1 = LIVE (production),
  id=2 = the isolated TEST deployment. Flipping toggles on one row never touches
  the other, so testing open/close on the test site can't move the live site.

  The row is chosen at RUNTIME from the browser host, so no build-time flag or
  Cloud Build trigger change is needed (the live and test services build the
  same image). An explicit NEXT_PUBLIC_APP_ENV still wins if it's ever set at
  build time (direct process.env ref so Next can inline it).

  Live-safe by construction: the default is 1, and only a host explicitly listed
  in TEST_HOSTS returns 2. The live host is never listed, so production always
  stays on id=1 — including under any future custom domain. Merge-safe too: the
  same code runs on both branches; behaviour is keyed off the host, not the code.
*/

// Cloud Run hosts (add any custom domains here) that ARE the test deployment.
const TEST_HOSTS = new Set<string>([
  "test-1041806466019.europe-west1.run.app",
]);

export function getSettingsId(): 1 | 2 {
  if (process.env.NEXT_PUBLIC_APP_ENV === "test") return 2;
  if (process.env.NEXT_PUBLIC_APP_ENV === "production") return 1;
  if (typeof window !== "undefined" && TEST_HOSTS.has(window.location.hostname)) return 2;
  return 1;
}
