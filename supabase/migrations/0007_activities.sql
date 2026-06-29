-- Project Off The Books · activities layer (toggles + Activity 1 submissions).
-- Adds per-activity open/close flags (like guess_page_open) and a public table
-- for Activity 1 ("About Me") submissions so every player can browse everyone's
-- profile links. Also makes satyamrathi01@gmail.com a super admin.
-- Run this once in your Supabase SQL editor (after 0004–0006).

------------------------------------------------------------------------------
-- per-activity open flags on the single settings row
------------------------------------------------------------------------------
alter table public.app_settings add column if not exists activity1_open boolean not null default false;
alter table public.app_settings add column if not exists activity2_open boolean not null default false;

------------------------------------------------------------------------------
-- Activity 1 ("About Me") submissions — one hosted link per member.
------------------------------------------------------------------------------
create table if not exists public.activity1_submissions (
  member_id  text        primary key references public.members (id) on delete cascade,
  vercel_url text        not null,
  updated_at timestamptz not null default now()
);

alter table public.activity1_submissions enable row level security;

-- Everyone (signed-in players) can READ all submissions → the public gallery.
drop policy if exists "a1 read" on public.activity1_submissions;
create policy "a1 read" on public.activity1_submissions for select using (true);

-- A player may write ONLY their own row (member matched by their signed-in email);
-- super admins may write any. Helper for the owner check:
create or replace function public.owns_member(p_member_id text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.members m
    where m.id = p_member_id
      and lower(coalesce(m.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

drop policy if exists "a1 insert" on public.activity1_submissions;
drop policy if exists "a1 update" on public.activity1_submissions;
drop policy if exists "a1 delete" on public.activity1_submissions;
create policy "a1 insert" on public.activity1_submissions for insert
  with check (public.owns_member(member_id) or public.is_super_admin());
create policy "a1 update" on public.activity1_submissions for update
  using (public.owns_member(member_id) or public.is_super_admin())
  with check (public.owns_member(member_id) or public.is_super_admin());
create policy "a1 delete" on public.activity1_submissions for delete
  using (public.owns_member(member_id) or public.is_super_admin());

-- Live gallery: broadcast submissions as they land.
alter publication supabase_realtime add table public.activity1_submissions;

------------------------------------------------------------------------------
-- Add the Gmail host as a super admin (keep in sync with event.json superAdmins).
------------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'admin.software@verveadvisory.com',
    'info@verveadvisory.com',
    'satyamrathi01@gmail.com'
  );
$$;
