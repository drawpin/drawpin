-- The podiums the board reveals when voting ends: a week's top three, and a
-- month's finalists in order (docs/PLAN.md v12, Weekly cycle).
--
-- Vote counts stay hidden while voting is open, so both return nothing until
-- their window has closed. They rank exactly as the crowning functions do
-- (finalize_week_winner, finalize_super_winner): most votes, then the earlier
-- post. A tile already in the Hall of Fame stays eligible even if its
-- account has since been deleted. Server only, like the functions they
-- mirror.

create function public.week_podium(p_week_id uuid)
returns table (
  place int,
  tile_id uuid,
  display_name text,
  name_tag text,
  caption text,
  image_path text,
  votes int
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (row_number() over (order by count(v.id) desc, t.created_at asc, t.id asc))::int,
    t.id, t.display_name, t.name_tag::text, t.caption::text, t.image_path,
    count(v.id)::int
  from public.weeks w
  join public.tiles t on t.week_id = w.id
  join public.votes v on v.tile_id = t.id
  where w.id = p_week_id
    and now() >= w.voting_ends_at
    and t.status = 'live'
    and (
      t.user_id is not null
      or exists (select 1 from public.hall_of_fame h where h.tile_id = t.id)
    )
  group by t.id, t.created_at
  order by count(v.id) desc, t.created_at asc, t.id asc
  limit 3;
$$;

create function public.final_podium(p_final_id uuid)
returns table (
  place int,
  tile_id uuid,
  display_name text,
  name_tag text,
  caption text,
  image_path text,
  votes int
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (row_number() over (order by count(v.id) desc, t.created_at asc, t.id asc))::int,
    t.id, t.display_name, t.name_tag::text, t.caption::text, t.image_path,
    count(v.id)::int
  from public.monthly_finals f
  join public.list_finalists(f.id) l on true
  join public.tiles t on t.id = l.tile_id
  left join public.final_votes v on v.tile_id = t.id and v.final_id = f.id
  where f.id = p_final_id
    and now() >= f.ends_at
  group by t.id, t.created_at
  order by count(v.id) desc, t.created_at asc, t.id asc
  limit 3;
$$;

revoke all on function public.week_podium(uuid) from public;
revoke all on function public.final_podium(uuid) from public;
grant execute on function public.week_podium(uuid) to service_role;
grant execute on function public.final_podium(uuid) to service_role;

notify pgrst, 'reload schema';
