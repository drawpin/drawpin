-- Queries the daily cleanup job needs (docs/PLAN.md, Data retention; ADR-003).
-- They live here because each one is a join the Data API can't express, and
-- none of it should be reachable by anyone but the server.

-- Weeks whose voting closed before the cut-off and still hold something the
-- job would delete. A week down to its winner is left out, so a venue with
-- years of history doesn't get re-swept every night for nothing.
create function public.list_expired_weeks(p_before timestamptz)
returns table (week_id uuid)
language sql
security definer
set search_path = ''
as $$
  select distinct w.id
  from public.weeks w
  join public.tiles t on t.week_id = w.id
  where w.voting_ends_at < p_before
    and not exists (
      select 1 from public.hall_of_fame h where h.tile_id = t.id
    )
    and not exists (
      select 1 from public.monthly_finals f where f.winner_tile_id = t.id
    )
  order by w.id;
$$;

revoke all on function public.list_expired_weeks(timestamptz) from public;
grant execute on function public.list_expired_weeks(timestamptz) to service_role;

-- A week's tiles that nothing is keeping: not its winner, and not a month's
-- super winner. Winners are kept forever (docs/PLAN.md, Data retention).
create function public.list_purgeable_tiles(p_week_id uuid)
returns table (tile_id uuid, image_path text)
language sql
security definer
set search_path = ''
as $$
  select t.id, t.image_path
  from public.tiles t
  where t.week_id = p_week_id
    and not exists (
      select 1 from public.hall_of_fame h where h.tile_id = t.id
    )
    and not exists (
      select 1 from public.monthly_finals f where f.winner_tile_id = t.id
    )
  order by t.created_at;
$$;

revoke all on function public.list_purgeable_tiles(uuid) from public;
grant execute on function public.list_purgeable_tiles(uuid) to service_role;

-- Devices unused since the cut-off that left nothing behind. A device that
-- posted or voted stays, because its tiles and votes still point at it.
create function public.delete_unused_devices(p_before timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted int;
begin
  with gone as (
    delete from public.devices d
    where d.first_seen_at < p_before
      and not exists (select 1 from public.tiles t where t.device_id = d.id)
      and not exists (select 1 from public.votes v where v.tile_id in (
        select t.id from public.tiles t where t.device_id = d.id
      ))
    returning 1
  )
  select count(*)::int into v_deleted from gone;

  return v_deleted;
end;
$$;

revoke all on function public.delete_unused_devices(timestamptz) from public;
grant execute on function public.delete_unused_devices(timestamptz) to service_role;
