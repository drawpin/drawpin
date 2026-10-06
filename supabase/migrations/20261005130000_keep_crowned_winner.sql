-- A crowned week keeps its winner while that drawing is still up.
--
-- finalize_week_winner used to recount on every call. A week is re-judged
-- whenever the owner removes any tile from it, and by then the count can
-- have moved for reasons that shouldn't change a declared result: deleting
-- an account takes its votes with it, and takes the account off its own
-- winning tile, which made that tile ineligible (only account tiles win).
-- Either could hand a settled week to someone else. Winners are kept for
-- ever (docs/PLAN.md, Data retention), so now the only thing that re-crowns
-- a week is its winning tile being removed.
create or replace function public.finalize_week_winner(p_week_id uuid) returns uuid
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

  -- Already crowned, and the winning drawing is still up: the result stands.
  select h.tile_id into v_tile_id
  from public.hall_of_fame h
  join public.tiles t on t.id = h.tile_id
  where h.week_id = p_week_id and t.status = 'live';
  if found then return v_tile_id; end if;

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

notify pgrst, 'reload schema';
