-- Project Off The Books · Activity 2 team repos (admin-editable).
-- One GitHub repo per team for the live commit leaderboard. Moving these out of
-- config/activity2.json (which needs a redeploy) into a table the super admin can
-- edit live from the Activities tab. The /api/commits route reads these (with the
-- config slugs as a fallback) to count commits per team + per member.
-- Run once in your Supabase SQL editor (after 0009).

------------------------------------------------------------------------------
-- repo slug/URL per team (keyed by team id)
------------------------------------------------------------------------------
create table if not exists public.activity2_repos (
  team_id    text        primary key,
  repo       text        not null default '',
  updated_at timestamptz not null default now()
);

alter table public.activity2_repos enable row level security;

drop policy if exists "a2 repos read" on public.activity2_repos;
drop policy if exists "a2 repos write" on public.activity2_repos;
-- Everyone signed in can READ (the player clone step shows their team's repo).
create policy "a2 repos read" on public.activity2_repos for select using (true);
-- Only super admins may set them.
create policy "a2 repos write" on public.activity2_repos for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Live: the clone step + admin editor react as repos are set.
alter publication supabase_realtime add table public.activity2_repos;

-- Known slots (one per team + the test team). Editing happens in the admin panel.
insert into public.activity2_repos (team_id) values
  ('team1'), ('team2'), ('team3'), ('team4'),
  ('team5'), ('team6'), ('team7'), ('team8'),
  ('demo')
on conflict (team_id) do nothing;
