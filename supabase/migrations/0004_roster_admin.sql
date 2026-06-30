-- Project Off The Books · editable roster + open/close toggle.
-- Moves teams, members and per-member clues OUT of config/*.json and INTO the
-- database, so the super-admin panel can edit team membership, emails/names and
-- clues — and open/close the crew-guessing page — live, with no redeploy.
-- Run this once in your Supabase project's SQL Editor (then run 0005 to seed).
--
-- The browser reads these tables (anon SELECT). WRITES are restricted to the
-- super-admin emails via the signed-in JWT, so a curious player can't flip the
-- toggle early or rearrange teams.

------------------------------------------------------------------------------
-- teams
------------------------------------------------------------------------------
create table if not exists public.teams (
  id         text        primary key,
  name       text        not null,
  color      text        not null,
  sort_order integer     not null default 0,
  updated_at timestamptz not null default now()
);

------------------------------------------------------------------------------
-- members  (team_id NULL = "unplaced": in the roster, not yet on a crew)
------------------------------------------------------------------------------
create table if not exists public.members (
  id            text        primary key,
  email         text,
  display_name  text        not null,
  team_id       text        references public.teams (id) on delete set null,
  is_manager    boolean     not null default false,
  sort_order    integer     not null default 0,   -- position within the team (drives guess pairing)
  guess_targets text[],                            -- optional explicit pairings; NULL = ring neighbours
  clues         jsonb       not null default '{"hobbies":[],"quirks":[],"funFacts":[]}'::jsonb,
  updated_at    timestamptz not null default now()
);

create index if not exists members_team_idx on public.members (team_id, sort_order);

------------------------------------------------------------------------------
-- app_settings  (single row, id = 1)
------------------------------------------------------------------------------
create table if not exists public.app_settings (
  id              integer     primary key default 1,
  guess_page_open boolean     not null default false,
  updated_at      timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

insert into public.app_settings (id, guess_page_open)
values (1, false)
on conflict (id) do nothing;

------------------------------------------------------------------------------
-- RLS: everyone reads; only super admins write.
------------------------------------------------------------------------------
alter table public.teams        enable row level security;
alter table public.members      enable row level security;
alter table public.app_settings enable row level security;

-- The admin allow-list. Keep in sync with event.json "superAdmins".
create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'admin.software@verveadvisory.com',
    'info@verveadvisory.com'
  );
$$;

-- teams
drop policy if exists "teams read"  on public.teams;
drop policy if exists "teams write" on public.teams;
create policy "teams read"  on public.teams for select using (true);
create policy "teams write" on public.teams for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- members
drop policy if exists "members read"  on public.members;
drop policy if exists "members write" on public.members;
create policy "members read"  on public.members for select using (true);
create policy "members write" on public.members for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- app_settings
drop policy if exists "settings read"  on public.app_settings;
drop policy if exists "settings write" on public.app_settings;
create policy "settings read"  on public.app_settings for select using (true);
create policy "settings write" on public.app_settings for all
  using (public.is_super_admin()) with check (public.is_super_admin());

------------------------------------------------------------------------------
-- Realtime: broadcast settings (live open/close) + roster edits to clients.
------------------------------------------------------------------------------
alter publication supabase_realtime add table public.app_settings;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.members;
