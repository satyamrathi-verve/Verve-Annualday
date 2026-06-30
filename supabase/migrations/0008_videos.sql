-- Project Off The Books · editable video URLs + a public Storage bucket.
-- The 6 event videos are hosted in Supabase Storage (or any CDN); their URLs are
-- stored here so the super admin can paste/swap them live, no redeploy. Screens
-- (briefing + the 3 bridge transmissions, etc.) read these URLs.
-- Run once in your Supabase SQL editor (after 0004–0007).

------------------------------------------------------------------------------
-- video URLs, one row per slot (key)
------------------------------------------------------------------------------
create table if not exists public.videos (
  key        text        primary key,
  url        text        not null default '',
  updated_at timestamptz not null default now()
);

alter table public.videos enable row level security;

drop policy if exists "videos read" on public.videos;
drop policy if exists "videos write" on public.videos;
create policy "videos read" on public.videos for select using (true);
create policy "videos write" on public.videos for all
  using (public.is_super_admin()) with check (public.is_super_admin());

alter publication supabase_realtime add table public.videos;

-- Known slots (more can be added later). Editing happens in the admin panel.
insert into public.videos (key) values
  ('briefing'),
  ('bridge1'),
  ('bridge2'),
  ('bridge3')
on conflict (key) do nothing;

------------------------------------------------------------------------------
-- Public Storage bucket for the video files.
-- (You can also create this in the dashboard: Storage → New bucket → name
-- "videos", Public = on. Then drag the compressed .mp4s in and copy each public
-- URL into the admin Videos tab.)
------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;
