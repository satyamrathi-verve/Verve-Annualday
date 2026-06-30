-- Let super admins read the sign-in log from the dashboard.
-- public.attendees (created in 0003) records each person's FIRST sign-in via a
-- trigger on auth.users. It had NO client read policy (admin-only via the
-- Supabase dashboard). This adds a SELECT policy so the signed-in super admins
-- can see "who has logged into the portal" right on the control panel.
-- Run this once in your Supabase SQL editor (needs 0004's is_super_admin()).

drop policy if exists "attendees admin read" on public.attendees;
create policy "attendees admin read" on public.attendees
  for select using (public.is_super_admin());
