-- Stream tile and week changes to open boards through Supabase Realtime.
--
-- tiles: new posts appear on the board without a refresh.
-- weeks: the first post of a new week creates the week row, so a board still
-- showing last week needs to hear about it to switch over.
--
-- Realtime applies row level security per subscriber, so visitors only
-- receive rows the existing "publicly readable" policies already let them
-- select — live tiles and weeks, nothing from devices, votes, or codes.
alter publication supabase_realtime add table public.tiles, public.weeks;
