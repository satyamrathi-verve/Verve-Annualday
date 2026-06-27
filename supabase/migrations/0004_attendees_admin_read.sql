-- Project Off The Books · let super admins read the sign-in log, live.
-- Migration 0003 created public.attendees with RLS ON and NO client policies, so
-- the browser can't read it (admin-only by design). The super-admin dashboard
-- needs to show "who has logged in" from the browser, so we add ONE narrow
-- SELECT policy: only the super-admin emails may read the log. Everyone else
-- (anon or a normal signed-in attendee) still sees nothing. We also add the
-- table to the realtime publication so new sign-ins stream into the dashboard
-- without a refresh. Run this once in your Supabase SQL Editor (or via the CLI).

-- Keep this list in sync with config/event.json → superAdmins[].email.
-- (SQL can't read the JSON config, so the allow-list is mirrored here.)
drop policy if exists "super admins read attendees" on public.attendees;
create policy "super admins read attendees"
  on public.attendees
  for select
  to authenticated
  using (
    lower(auth.jwt() ->> 'email') in (
      'info@verveadvisory.com',
      'admin.software@verveadvisory.com'
    )
  );

-- Stream INSERTs (each first-time sign-in) to subscribed super-admin clients.
-- Realtime still honours RLS, so only super admins actually receive the rows.
-- Guarded so re-running this migration doesn't error on "already a member".
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'attendees'
  ) then
    alter publication supabase_realtime add table public.attendees;
  end if;
end $$;
