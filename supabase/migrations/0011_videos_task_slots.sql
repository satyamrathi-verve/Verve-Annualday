-- Project Off The Books · video slots for the two task arcs.
-- Each activity arc is: short video → date-gated wait → intro video → activity →
-- closing video. These four slots are pasted/swapped live in the admin Videos tab
-- (the 'briefing' + 'bridge3' slots already exist from 0008).
--   wheelOutro — after the wheel, sends players into the Task 1 wait
--   a1intro    — explains Activity 1 (plays before the steps)
--   a1outro    — Task 1 closing (plays after Activity 1)
--   a2intro    — explains Activity 2 (plays before the build screen)
-- Run once in your Supabase SQL editor (after 0010).

insert into public.videos (key) values
  ('wheelOutro'),
  ('a1intro'),
  ('a1outro'),
  ('a2intro')
on conflict (key) do nothing;
