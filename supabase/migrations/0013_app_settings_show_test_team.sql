-- Project Off The Books · a super-admin switch to reveal the test crew (Project 9).
-- "Project 9" (team id = 'demo') is a throwaway test team. By default it is HIDDEN
-- from the player-facing dashboards (the profile gallery + the live commit board),
-- so the real event only ever shows the eight real crews. Flip this on from the
-- admin panel when you want the test team to appear too. Env-scoped like the other
-- toggles: id=1 = live, id=2 = test (see lib/data/settingsId.ts). Both rows get the
-- column with a safe default of false. Run once in your Supabase SQL editor
-- (after 0004-0012).

alter table public.app_settings
  add column if not exists show_test_team boolean not null default false;
