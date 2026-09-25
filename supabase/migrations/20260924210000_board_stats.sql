-- Public participation stats for a board: how many people have drawn, how many
-- drawings there are in total, and how many this week.
--
-- "People" is a count of distinct devices, which needs tiles.device_id — and
-- that column is deliberately not readable by the public role
-- (20260924190000_restrict_public_columns.sql). So this is a SECURITY DEFINER
-- function: it counts the ids internally and returns only the totals, never an
-- id. The search_path is pinned, as it must be for a definer function.
--
-- Only live tiles count; a removed (moderated) tile is not a drawing on the
-- board. All-time totals reflect what the board still holds — non-winning tiles
-- are pruned 30 days after voting (docs/PLAN.md, Data retention) — which for a
-- board's first weeks is simply everything ever drawn.
create or replace function public.board_stats(p_venue_id uuid)
returns table (people bigint, total_drawings bigint, week_drawings bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (
      select count(distinct t.device_id)
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

-- Default execute is granted to PUBLIC; narrow it to the API roles.
revoke all on function public.board_stats(uuid) from public;
grant execute on function public.board_stats(uuid) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
