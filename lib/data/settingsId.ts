/*
  Which app_settings row this deployment reads/writes.

  There are two rows in Supabase: id=1 is the LIVE (production) environment,
  id=2 is the TEST deployment. Which one a build talks to is frozen at BUILD
  time via NEXT_PUBLIC_APP_ENV — the reference below must stay a direct
  `process.env.NEXT_PUBLIC_APP_ENV` lookup so Next inlines it into the browser
  bundle (a computed/aliased lookup would NOT be inlined).

  Default is 1: any build that does NOT explicitly set NEXT_PUBLIC_APP_ENV=test
  targets the live row. This keeps the backup→main merge safe — main never
  carries the test flag, so live always stays on id=1. Only the test service's
  build passes NEXT_PUBLIC_APP_ENV=test.
*/
export const SETTINGS_ID = process.env.NEXT_PUBLIC_APP_ENV === "test" ? 2 : 1;
