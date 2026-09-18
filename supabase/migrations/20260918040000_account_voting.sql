-- Voting belongs to an account, not a device (docs/adr/004-customer-accounts.md).
--
-- The table has never held a row, so it's reshaped rather than migrated: a
-- device-keyed vote meant a fresh three votes on every device someone picked
-- up, and let them vote for their own tile from a second one.

drop trigger votes_enforce_rules on votes;
drop function enforce_vote_rules();
drop table votes;

create table votes (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks (id) on delete cascade,
  tile_id uuid not null references tiles (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Each of an account's 3 votes must land on a different tile.
  unique (week_id, user_id, tile_id)
);

create index votes_tile_idx on votes (tile_id);
create index votes_week_user_idx on votes (week_id, user_id);

alter table votes enable row level security;

-- Live counts stay hidden until voting closes (docs/PLAN.md, Weekly cycle),
-- so nobody but the server may read or write them.
grant select, insert, update, delete on table votes to service_role;

-- The rules that are not constraints, enforced where they cannot be bypassed.
create function enforce_vote_rules() returns trigger
language plpgsql
as $$
declare
  tile_week_id uuid;
  tile_user_id uuid;
  tile_status_value tile_status;
  week_posting_ends_at timestamptz;
  week_voting_ends_at timestamptz;
  votes_this_week int;
begin
  -- Serialise this account's votes for this week before counting them.
  -- Without it, three requests arriving together each read "2 used" and each
  -- insert, and the account ends up with more votes than it has.
  perform pg_advisory_xact_lock(
    hashtextextended(new.week_id::text || ':' || new.user_id::text, 0)
  );

  select posting_ends_at, voting_ends_at
    into week_posting_ends_at, week_voting_ends_at
  from weeks where id = new.week_id;

  -- The window is derived from the week's own timestamps (ADR-003).
  if now() < week_posting_ends_at then
    raise exception 'week % is still taking posts', new.week_id;
  end if;
  if now() >= week_voting_ends_at then
    raise exception 'voting has closed for week %', new.week_id;
  end if;

  select week_id, user_id, status
    into tile_week_id, tile_user_id, tile_status_value
  from tiles where id = new.tile_id;

  if tile_week_id <> new.week_id then
    raise exception 'vote week_id % does not match tile week_id %',
      new.week_id, tile_week_id;
  end if;

  if tile_status_value <> 'live' then
    raise exception 'tile % is not live', new.tile_id;
  end if;

  -- Guest tiles are shown on the board but never compete (docs/PLAN.md).
  if tile_user_id is null then
    raise exception 'tile % was posted without an account', new.tile_id;
  end if;

  if tile_user_id = new.user_id then
    raise exception 'account % cannot vote on its own tile', new.user_id;
  end if;

  select count(*) into votes_this_week
  from votes
  where week_id = new.week_id and user_id = new.user_id;

  if votes_this_week >= 3 then
    raise exception 'account % has already used its 3 votes for week %',
      new.user_id, new.week_id;
  end if;

  return new;
end;
$$;

create trigger votes_enforce_rules
  before insert on votes
  for each row
  execute function enforce_vote_rules();
