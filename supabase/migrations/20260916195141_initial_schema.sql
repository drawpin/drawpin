-- Initial DrawPin schema: venues, weekly boards, tiles, voting, and the
-- device-limiting tables. Mirrors the ERD in docs/ERD.md; domain rules come
-- from docs/PLAN.md.
--
-- Day and week boundaries are 4:00 AM venue local time. Those boundaries are
-- computed in the app (which knows each venue's IANA timezone) and stored here
-- as absolute timestamptz values, so Postgres never has to do timezone math.

-- Lets daily_codes use an exclusion constraint over (code, validity range).
create extension if not exists btree_gist;

create type week_status as enum ('posting', 'voting', 'closed');
create type tile_status as enum ('live', 'removed');

-- Owners are the only accounts. Mirrors auth.users so venues can key off a
-- public-schema row instead of reaching into the auth schema.
create table owners (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table venues (
  id uuid primary key default gen_random_uuid(),
  -- Unique: one board per owner (docs/PLAN.md, Owner admin).
  owner_id uuid not null unique references owners (id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- IANA name, e.g. "America/Chicago". Validated in the app, since Postgres
  -- timezone lookups aren't immutable enough for a check constraint.
  timezone text not null,
  is_paused boolean not null default false,
  created_at timestamptz not null default now()
);

-- The 8-digit code people type instead of scanning the QR. Rotates daily at
-- 4:00 AM venue local time.
create table daily_codes (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  code char(8) not null check (code ~ '^[0-9]{8}$'),
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  constraint daily_codes_validity_order check (valid_until > valid_from),
  -- A typed code has to resolve to exactly one venue, so the same code may
  -- never be live at two venues at once. Overlapping validity windows with an
  -- equal code are rejected; the generator retries with a new code.
  constraint daily_codes_no_overlapping_duplicates exclude using gist (
    code with =,
    tstzrange(valid_from, valid_until) with &&
  )
);

create index daily_codes_venue_valid_from_idx
  on daily_codes (venue_id, valid_from desc);

-- One row per venue per weekly cycle: week N takes posts, week N+1 takes votes
-- on it, then it closes and the top 7 are frozen into hall_of_fame.
create table weeks (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  starts_at timestamptz not null,
  posting_ends_at timestamptz not null,
  voting_ends_at timestamptz not null,
  status week_status not null default 'posting',
  -- Set when voting ends: non-Hall-of-Fame tiles are deleted after this.
  -- Nullable because it isn't known until the week closes.
  purge_after timestamptz,
  unique (venue_id, starts_at),
  constraint weeks_phase_order check (
    posting_ends_at > starts_at and voting_ends_at > posting_ends_at
  )
);

create index weeks_venue_status_idx on weeks (venue_id, status);

-- One row per visitor device. Only hashes are stored (docs/PLAN.md, Data
-- retention) — never a raw IP or fingerprint. The id is what the signed
-- device-ID cookie carries.
create table devices (
  id uuid primary key default gen_random_uuid(),
  fingerprint_hash text,
  last_ip_hash text,
  first_seen_at timestamptz not null default now()
);

create index devices_fingerprint_hash_idx on devices (fingerprint_hash);

create table tiles (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks (id) on delete cascade,
  -- Restricted rather than cascaded: losing a device row must never silently
  -- delete the drawings attributed to it.
  device_id uuid not null references devices (id) on delete restrict,
  -- Null display_name means the tile was posted anonymously. The 4-digit tag
  -- disambiguates repeated usernames, e.g. "Ahmad#4821", so it travels with
  -- the name: either both are set or neither is.
  display_name text check (length(display_name) between 1 and 40),
  name_tag char(4) check (name_tag ~ '^[0-9]{4}$'),
  caption varchar(80),
  image_path text not null,
  status tile_status not null default 'live',
  created_at timestamptz not null default now(),
  constraint tiles_name_and_tag_together check (
    (display_name is null) = (name_tag is null)
  )
);

-- The board feed: live tiles for a week, newest first.
create index tiles_week_created_idx
  on tiles (week_id, created_at desc)
  where status = 'live';

-- Votes are final — there is no update or delete path in the app.
create table votes (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks (id) on delete cascade,
  tile_id uuid not null references tiles (id) on delete cascade,
  device_id uuid not null references devices (id) on delete restrict,
  created_at timestamptz not null default now(),
  -- Each of a device's 3 votes must land on a different tile.
  unique (week_id, device_id, tile_id)
);

create index votes_tile_idx on votes (tile_id);

-- The remaining vote rules can't be expressed as constraints, and vote
-- stuffing is the accepted risk of open voting (docs/PLAN.md, Weekly cycle),
-- so they're enforced here rather than only in the API route.
create function enforce_vote_rules() returns trigger
language plpgsql
as $$
declare
  tile_week_id uuid;
  tile_device_id uuid;
  votes_this_week int;
begin
  select week_id, device_id into tile_week_id, tile_device_id
  from tiles
  where id = new.tile_id;

  if tile_week_id <> new.week_id then
    raise exception 'vote week_id % does not match tile week_id %',
      new.week_id, tile_week_id;
  end if;

  if tile_device_id = new.device_id then
    raise exception 'device % cannot vote on its own tile', new.device_id;
  end if;

  select count(*) into votes_this_week
  from votes
  where week_id = new.week_id and device_id = new.device_id;

  if votes_this_week >= 3 then
    raise exception 'device % has already used its 3 votes for week %',
      new.device_id, new.week_id;
  end if;

  return new;
end;
$$;

create trigger votes_enforce_rules
  before insert on votes
  for each row
  execute function enforce_vote_rules();

-- Tracks the daily posting budget per device per venue: one post per day, and
-- 3 moderation-blocked attempts lock the device until the next 4:00 AM reset.
create table post_attempts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  device_id uuid not null references devices (id) on delete cascade,
  -- The venue-local day the 4:00 AM reset belongs to, not a UTC calendar day.
  local_day date not null,
  blocked_count int not null default 0 check (blocked_count >= 0),
  has_posted boolean not null default false,
  unique (venue_id, device_id, local_day)
);

-- The frozen top 7 of a finished week. Kept forever, so the tile reference is
-- restricted: the 30-day purge must not be able to delete a winning tile.
create table hall_of_fame (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  week_id uuid not null references weeks (id) on delete cascade,
  tile_id uuid not null unique references tiles (id) on delete restrict,
  rank smallint not null check (rank between 1 and 7),
  vote_count int not null check (vote_count >= 0),
  unique (week_id, rank)
);

create index hall_of_fame_venue_idx on hall_of_fame (venue_id);

-- Row level security -------------------------------------------------------
--
-- Every write goes through an API route using the service role key, which
-- bypasses RLS. These policies therefore only grant the reads the public board
-- and the owner screen need; anything without a policy stays unreadable to the
-- anon and authenticated keys.

alter table owners enable row level security;
alter table venues enable row level security;
alter table daily_codes enable row level security;
alter table weeks enable row level security;
alter table devices enable row level security;
alter table tiles enable row level security;
alter table votes enable row level security;
alter table post_attempts enable row level security;
alter table hall_of_fame enable row level security;

create policy "Owners read their own row"
  on owners for select
  to authenticated
  using (id = (select auth.uid()));

-- Boards are public to anyone with the link, so venue, week, live tile, and
-- Hall of Fame rows are world-readable.
create policy "Venues are publicly readable"
  on venues for select
  to anon, authenticated
  using (true);

create policy "Weeks are publicly readable"
  on weeks for select
  to anon, authenticated
  using (true);

create policy "Live tiles are publicly readable"
  on tiles for select
  to anon, authenticated
  using (status = 'live');

create policy "Hall of Fame is publicly readable"
  on hall_of_fame for select
  to anon, authenticated
  using (true);

-- Codes are not public: reading every venue's live code would defeat the
-- point of rotating them. Only the owner's admin screen needs them.
create policy "Owners read their own venue codes"
  on daily_codes for select
  to authenticated
  using (
    exists (
      select 1 from venues
      where venues.id = daily_codes.venue_id
        and venues.owner_id = (select auth.uid())
    )
  );

-- devices, votes, and post_attempts deliberately have no policies: they hold
-- per-device tracking and in-flight vote tallies that nothing client-side may
-- read.

-- Table documentation ------------------------------------------------------

comment on table owners is 'Venue owners; mirrors auth.users. The only accounts in the product.';
comment on table venues is 'One drawing board per owner, addressed publicly by slug.';
comment on table daily_codes is 'Rotating 8-digit join codes, one live code per venue at a time.';
comment on table weeks is 'A venue''s weekly cycle: posting, then voting, then closed.';
comment on table devices is 'Visitor devices, identified by cookie; stores only hashed IP/fingerprint.';
comment on table tiles is 'A drawing plus optional caption and username, posted to one week.';
comment on table votes is 'Final votes cast during the following week; 3 per device per week.';
comment on table post_attempts is 'Per-device daily posting budget and blocked-attempt count.';
comment on table hall_of_fame is 'Frozen top 7 tiles of a finished week; retained forever.';
