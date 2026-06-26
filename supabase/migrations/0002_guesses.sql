-- Operation Prompt & Co. · "Guess Your Crew" directed-guess graph.
-- Replaces the binary canister_state model: a canister's colour is now DERIVED
-- from who has guessed whom.
--   grey   = nobody has guessed this person
--   yellow = someone guessed them, but it isn't mutual yet ("you may be right…")
--   green  = two people guessed EACH OTHER  (or a manager force-revealed them)
-- Run this once in your Supabase project's SQL Editor (or via the Supabase CLI).
-- Only DYNAMIC state lives here; roster/teams/clues/assignments stay in config/*.json.

create table if not exists public.guesses (
  team_id    text        not null,
  guesser_id text        not null,            -- who made the guess ('__godmode__' = manager override)
  guessed_id text        not null,            -- who they correctly identified
  created_at timestamptz not null default now(),
  primary key (team_id, guesser_id, guessed_id)
);

alter table public.guesses enable row level security;

-- PROTOTYPE policies: anon read/write so the (mock or Verve-auth) identity can
-- drive the wheel. TIGHTEN later — e.g. restrict inserts to the authenticated
-- guesser on their own team.
drop policy if exists "anon read"   on public.guesses;
drop policy if exists "anon insert" on public.guesses;
drop policy if exists "anon update" on public.guesses;
drop policy if exists "anon delete" on public.guesses;

create policy "anon read"   on public.guesses for select using (true);
create policy "anon insert" on public.guesses for insert with check (true);
create policy "anon update" on public.guesses for update using (true) with check (true);
create policy "anon delete" on public.guesses for delete using (true);

-- Broadcast row changes to subscribed clients.
alter publication supabase_realtime add table public.guesses;
