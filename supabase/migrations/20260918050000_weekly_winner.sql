-- One winner per week, crowned on demand (docs/PLAN.md v8, Weekly cycle;
-- ADR-003). The table was built for a top seven; the plan is a single winner.

alter table hall_of_fame drop constraint hall_of_fame_week_id_rank_key;
alter table hall_of_fame drop column rank;
alter table hall_of_fame add constraint hall_of_fame_one_per_week unique (week_id);

-- Crowns a closed week's winner, or clears its entry when nothing is eligible.
--
-- Called the first time a result is needed rather than by a job, so it has to
-- be safe to call again: two people opening the Hall of Fame at the same
-- moment must end up with one row, and an owner removing the winning tile has
-- to leave the week crowning whatever is left.
create function public.finalize_week_winner(p_week_id uuid) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venue_id uuid;
  v_voting_ends_at timestamptz;
  v_tile_id uuid;
  v_votes int;
begin
  select venue_id, voting_ends_at into v_venue_id, v_voting_ends_at
  from public.weeks where id = p_week_id;

  if not found then return null; end if;
  -- Still being voted on: live counts stay hidden until it closes.
  if now() < v_voting_ends_at then return null; end if;

  -- Serialise this week, so simultaneous first views crown it once.
  perform pg_advisory_xact_lock(hashtextextended(p_week_id::text, 1));

  -- Ties go to the earlier post; a tile needs at least one vote; guest tiles
  -- and removed tiles never win (docs/PLAN.md, Accounts and Weekly cycle).
  select t.id, count(v.id)::int into v_tile_id, v_votes
  from public.tiles t
  join public.votes v on v.tile_id = t.id
  where t.week_id = p_week_id
    and t.status = 'live'
    and t.user_id is not null
  group by t.id, t.created_at
  order by count(v.id) desc, t.created_at asc, t.id asc
  limit 1;

  if v_tile_id is null then
    -- No votes at all, or the winner was removed and nothing else was voted
    -- for: the week simply has no winner.
    delete from public.hall_of_fame where week_id = p_week_id;
    return null;
  end if;

  insert into public.hall_of_fame (venue_id, week_id, tile_id, vote_count)
  values (v_venue_id, p_week_id, v_tile_id, v_votes)
  on conflict (week_id) do update
    set tile_id = excluded.tile_id,
        vote_count = excluded.vote_count;

  return v_tile_id;
end;
$$;

revoke all on function public.finalize_week_winner(uuid) from public;
grant execute on function public.finalize_week_winner(uuid) to service_role;

-- Brings a venue's Hall of Fame up to date: every closed week that has no
-- entry yet, plus any whose winning tile has since been removed.
create function public.finalize_venue_winners(p_venue_id uuid) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week_id uuid;
  v_finalized int := 0;
begin
  for v_week_id in
    select w.id
    from public.weeks w
    left join public.hall_of_fame h on h.week_id = w.id
    left join public.tiles t on t.id = h.tile_id
    where w.venue_id = p_venue_id
      and w.voting_ends_at <= now()
      and (h.id is null or t.status <> 'live')
    order by w.starts_at desc
  loop
    perform public.finalize_week_winner(v_week_id);
    v_finalized := v_finalized + 1;
  end loop;

  return v_finalized;
end;
$$;

revoke all on function public.finalize_venue_winners(uuid) from public;
grant execute on function public.finalize_venue_winners(uuid) to service_role;
