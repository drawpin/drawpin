-- "Artists" counts people, and since ADR-007 a person is an account: only a
-- signed-in account can post, from any number of devices. Counting distinct
-- devices, as board_stats did, counted someone twice for posting from their
-- phone and their laptop.
--
-- Guest tiles from before ADR-007 have no account, so each still counts by
-- the device that posted it until the 30-day clean-up removes it. On a new
-- board, then, artists equals drawings on the first day, and after that only
-- drawings grow as the same people post again.
--
-- Only the function body changes; its signature, grants and SECURITY DEFINER
-- stay as 20260924210000_board_stats.sql set them.
create or replace function public.board_stats(p_venue_id uuid)
returns table (people bigint, total_drawings bigint, week_drawings bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (
      select count(distinct coalesce('account:' || t.user_id::text,
                                     'device:' || t.device_id::text))
        from tiles t
        join weeks w on w.id = t.week_id
       where w.venue_id = p_venue_id
         and t.status = 'live'
    ) as people,
    (
      select count(*)
        from tiles t
        join weeks w on w.id = t.week_id
       where w.venue_id = p_venue_id
         and t.status = 'live'
    ) as total_drawings,
    (
      select count(*)
        from tiles t
        join weeks w on w.id = t.week_id
       where w.venue_id = p_venue_id
         and t.status = 'live'
         and w.starts_at <= now()
         and w.posting_ends_at > now()
    ) as week_drawings;
$$;

notify pgrst, 'reload schema';
