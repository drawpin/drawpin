-- The monthly final: up to four of a month's weekly winners, voted on for one
-- week, crowning a super winner (docs/PLAN.md v8, Monthly super winner).

-- One final per venue per venue-local month. The window is worked out from the
-- venue's own weeks and passed in, the same way the daily code's is, because
-- month boundaries are local and Postgres shouldn't be guessing time zones.
create table monthly_finals (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  -- First day of the venue-local month these finalists came from.
  month date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- Filled in when the final closes; null until then, or if nothing wins.
  winner_tile_id uuid references tiles (id) on delete set null,
  winner_vote_count int,
  constraint monthly_finals_window check (ends_at > starts_at),
  unique (venue_id, month)
);

create index monthly_finals_venue_idx on monthly_finals (venue_id, starts_at desc);

alter table monthly_finals enable row level security;

create policy "Monthly finals are publicly readable"
  on monthly_finals for select
  to anon, authenticated
  using (true);

grant select on table monthly_finals to anon, authenticated;
grant select, insert, update, delete on table monthly_finals to service_role;

-- One vote per account per final, which the primary key of the pair enforces
-- on its own: unlike weekly voting there's nothing to count, so nothing to
-- race over.
create table final_votes (
  id uuid primary key default gen_random_uuid(),
  final_id uuid not null references monthly_finals (id) on delete cascade,
  tile_id uuid not null references tiles (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (final_id, user_id)
);

create index final_votes_tile_idx on final_votes (tile_id);

alter table final_votes enable row level security;

-- Counts stay hidden until the final closes, like weekly votes.
grant select, insert, update, delete on table final_votes to service_role;

-- The finalists: that month's weekly winners, up to four, the most-voted in
-- their own weeks first and ties to the earlier post.
create function public.list_finalists(p_final_id uuid)
returns table (tile_id uuid, week_id uuid, week_votes int)
language sql
security definer
set search_path = ''
as $$
  select h.tile_id, h.week_id, h.vote_count
  from public.monthly_finals f
  join public.weeks w
    on w.venue_id = f.venue_id
   and w.starts_at >= f.month::timestamptz
   and w.starts_at < (f.month + interval '1 month')::timestamptz
  join public.hall_of_fame h on h.week_id = w.id
  join public.tiles t on t.id = h.tile_id
  where f.id = p_final_id
    and t.status = 'live'
  order by h.vote_count desc, t.created_at asc, t.id asc
  limit 4;
$$;

revoke all on function public.list_finalists(uuid) from public;
grant execute on function public.list_finalists(uuid) to service_role;

-- Returns the venue's final for this month, creating it on the first ask
-- (ADR-003). A conflict means another request won the race; its row is used.
create function public.ensure_monthly_final(
  p_venue_id uuid,
  p_month date,
  p_starts_at timestamptz,
  p_ends_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.monthly_finals
   where venue_id = p_venue_id and month = p_month;
  if found then return v_id; end if;

  insert into public.monthly_finals (venue_id, month, starts_at, ends_at)
  values (p_venue_id, p_month, p_starts_at, p_ends_at)
  on conflict (venue_id, month) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.monthly_finals
     where venue_id = p_venue_id and month = p_month;
  end if;

  return v_id;
end;
$$;

revoke all on function public.ensure_monthly_final(uuid, date, timestamptz, timestamptz) from public;
grant execute on function public.ensure_monthly_final(uuid, date, timestamptz, timestamptz) to service_role;

-- The rules a final vote has to satisfy, enforced where they can't be dodged.
create function public.enforce_final_vote_rules() returns trigger
language plpgsql
as $$
declare
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_tile_user_id uuid;
begin
  select starts_at, ends_at into v_starts_at, v_ends_at
  from public.monthly_finals where id = new.final_id;

  if now() < v_starts_at then
    raise exception 'final % has not opened yet', new.final_id;
  end if;
  if now() >= v_ends_at then
    raise exception 'final % has closed', new.final_id;
  end if;

  if not exists (
    select 1 from public.list_finalists(new.final_id) f
    where f.tile_id = new.tile_id
  ) then
    raise exception 'tile % is not a finalist', new.tile_id;
  end if;

  select user_id into v_tile_user_id from public.tiles where id = new.tile_id;
  if v_tile_user_id = new.user_id then
    raise exception 'account % cannot vote on its own tile', new.user_id;
  end if;

  return new;
end;
$$;

create trigger final_votes_enforce_rules
  before insert on final_votes
  for each row
  execute function public.enforce_final_vote_rules();

-- Crowns the month's super winner once its final has closed. Idempotent, so
-- two people opening the Hall of Fame together crown it once.
create function public.finalize_super_winner(p_final_id uuid) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ends_at timestamptz;
  v_finalists int;
  v_tile_id uuid;
  v_votes int;
begin
  select ends_at into v_ends_at from public.monthly_finals where id = p_final_id;
  if not found then return null; end if;
  if now() < v_ends_at then return null; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_final_id::text, 2));

  select count(*) into v_finalists from public.list_finalists(p_final_id);

  if v_finalists = 0 then
    update public.monthly_finals
       set winner_tile_id = null, winner_vote_count = null
     where id = p_final_id;
    return null;
  end if;

  -- A month with one finalist crowns it without a vote; otherwise the most
  -- final votes wins, ties to the earlier post, and no votes means no winner.
  select f.tile_id, count(v.id)::int into v_tile_id, v_votes
  from public.list_finalists(p_final_id) f
  join public.tiles t on t.id = f.tile_id
  left join public.final_votes v
    on v.tile_id = f.tile_id and v.final_id = p_final_id
  group by f.tile_id, t.created_at
  having v_finalists = 1 or count(v.id) > 0
  order by count(v.id) desc, t.created_at asc, f.tile_id asc
  limit 1;

  update public.monthly_finals
     set winner_tile_id = v_tile_id,
         winner_vote_count = case when v_tile_id is null then null else v_votes end
   where id = p_final_id;

  return v_tile_id;
end;
$$;

revoke all on function public.finalize_super_winner(uuid) from public;
grant execute on function public.finalize_super_winner(uuid) to service_role;
