-- Project Off The Books · env-scoped activity toggles.
-- Splits the toggle state into two rows so the TEST deployment's open/close
-- switches are isolated from LIVE: id=1 = live (production), id=2 = test.
-- The app chooses its row at build time via NEXT_PUBLIC_APP_ENV (see
-- lib/data/settingsId.ts); live keeps using id=1, so this is safe to run on the
-- shared project. Run once in your Supabase SQL editor (after 0004–0011).

------------------------------------------------------------------------------
-- Lift the "single row" lock (0004 pinned id = 1) and allow id ∈ {1, 2}.
------------------------------------------------------------------------------
alter table public.app_settings drop constraint if exists app_settings_singleton;
alter table public.app_settings drop constraint if exists app_settings_env;
alter table public.app_settings add  constraint app_settings_env check (id in (1, 2));

------------------------------------------------------------------------------
-- Seed the test row (id = 2), everything closed — a clean slate to toggle.
-- Existing table-wide RLS already covers it: public read, super-admin write.
-- Realtime already publishes the table (0004), so id=2 changes broadcast too.
------------------------------------------------------------------------------
insert into public.app_settings (id, guess_page_open, activity1_open, activity2_open)
values (2, false, false, false)
on conflict (id) do nothing;
