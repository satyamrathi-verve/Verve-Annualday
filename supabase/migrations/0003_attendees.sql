-- Project Off The Books · sign-in log.
-- A readable record of everyone who has signed in (Google / email), captured
-- automatically the FIRST time their account is created. Populated by a trigger
-- on auth.users — no app code involved. View it in the Supabase dashboard
-- (Table Editor → attendees) or with: select * from public.attendees order by first_seen desc;
-- Run this once in your Supabase project's SQL Editor (or via the Supabase CLI).

create table if not exists public.attendees (
  id           uuid        primary key references auth.users (id) on delete cascade,
  email        text        not null,
  display_name text,                                   -- from Google profile, when present
  first_seen   timestamptz not null default now()      -- their first sign-in
);

create index if not exists attendees_first_seen_idx on public.attendees (first_seen desc);

-- RLS on, with NO client policies: the browser (anon / signed-in user) can't
-- read or write this table. Rows are inserted by the SECURITY DEFINER trigger
-- below (which bypasses RLS), and you read them from the Supabase dashboard
-- (service role, also bypasses RLS). So the sign-in log stays admin-only.
alter table public.attendees enable row level security;

-- Mirror each newly-created auth user into public.attendees. For OAuth/OTP the
-- auth user is created on their FIRST sign-in, so this fires exactly once per
-- person — the moment they first log in.
create or replace function public.handle_new_attendee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.attendees (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_attendee();

-- Backfill anyone who already signed in before this trigger existed (e.g. you).
insert into public.attendees (id, email, display_name)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name')
from auth.users
on conflict (id) do nothing;
