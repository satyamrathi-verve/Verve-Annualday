-- Operation Getaway · shared "Guess Your Crew" wheel state.
-- Run this once in your Supabase project's SQL Editor (or via the Supabase CLI).
-- Only DYNAMIC state lives here; roster/teams/clues stay in config/*.json.

create table if not exists public.canister_state (
  team_id    text        not null,
  member_id  text        not null,
  lit        boolean     not null default false,
  lit_by     text,
  method     text        check (method in ('guess', 'godmode', 'self')),
  updated_at timestamptz not null default now(),
  primary key (team_id, member_id)
);

alter table public.canister_state enable row level security;

-- PROTOTYPE policies: synthetic data only, anon read/write so the mock-auth
-- identity can drive the wheel. TIGHTEN in Phase 2 once real (Google/Supabase)
-- auth lands — e.g. restrict writes to the authenticated member + their team.
drop policy if exists "anon read"   on public.canister_state;
drop policy if exists "anon insert" on public.canister_state;
drop policy if exists "anon update" on public.canister_state;
drop policy if exists "anon delete" on public.canister_state;

create policy "anon read"   on public.canister_state for select using (true);
create policy "anon insert" on public.canister_state for insert with check (true);
create policy "anon update" on public.canister_state for update using (true) with check (true);
create policy "anon delete" on public.canister_state for delete using (true);

-- Broadcast row changes to subscribed clients.
alter publication supabase_realtime add table public.canister_state;
