-- Project Off The Books · Activity 2 ("Build the Tool That Finally Fits").
-- Per-team submissions: the team LEAD records the repo + a short note when the
-- team is done (one row per team). Public-readable so the live board shows every
-- team. The commit leaderboard is served separately by the /api/commits route
-- (reading GitHub), NOT from this table. Run once in the SQL editor after 0007/0008.

------------------------------------------------------------------------------
-- Activity 2 submissions — one row per team (keyed by team id).
------------------------------------------------------------------------------
create table if not exists public.activity2_submissions (
  team_id      text        primary key,
  repo_url     text        not null,
  note         text,
  submitted_by text        references public.members (id) on delete set null,
  submitted_at timestamptz not null default now()
);

alter table public.activity2_submissions enable row level security;

-- Everyone signed in can READ → the public team board + admin status.
drop policy if exists "a2 read" on public.activity2_submissions;
create policy "a2 read" on public.activity2_submissions for select using (true);

-- Only the LEAD (is_manager) of that team — matched by their signed-in email —
-- may write their team's row; super admins may write any.
create or replace function public.manages_team(p_team_id text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.members m
    where m.team_id = p_team_id
      and m.is_manager = true
      and lower(coalesce(m.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

drop policy if exists "a2 insert" on public.activity2_submissions;
drop policy if exists "a2 update" on public.activity2_submissions;
drop policy if exists "a2 delete" on public.activity2_submissions;
create policy "a2 insert" on public.activity2_submissions for insert
  with check (public.manages_team(team_id) or public.is_super_admin());
create policy "a2 update" on public.activity2_submissions for update
  using (public.manages_team(team_id) or public.is_super_admin())
  with check (public.manages_team(team_id) or public.is_super_admin());
create policy "a2 delete" on public.activity2_submissions for delete
  using (public.manages_team(team_id) or public.is_super_admin());

-- Live board: broadcast submissions as they land.
alter publication supabase_realtime add table public.activity2_submissions;
