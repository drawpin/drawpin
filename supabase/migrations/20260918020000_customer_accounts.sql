-- Customer accounts (docs/adr/004-customer-accounts.md). Drawing still needs no
-- account; being voted for, voting and reporting do.

-- Customers, mirroring auth.users the way owners does for venue owners. An
-- owner has an owners row, a customer a profiles row, and the two never mix.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (length(btrim(username)) between 1 and 40),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Usernames are shown on the board, so anyone may read one. Writes go through
-- the server, like every other table.
create policy "usernames are public" on profiles for select using (true);

grant select on table profiles to anon, authenticated;
grant select, insert, update, delete on table profiles to service_role;

-- Null means a guest tile: it shows on the board, but can't be voted for or win
-- (docs/PLAN.md, Accounts). `on delete set null` rather than cascade, so
-- deleting an account can never take a Hall of Fame winner with it; the
-- deletion routine removes that person's other tiles itself.
alter table tiles add column user_id uuid references profiles (id) on delete set null;

create index tiles_user_id_idx on tiles (user_id);

-- The daily limit for signed-in posting. A signed-in post has to claim a row
-- here as well as its device's row in post_attempts, so a second device doesn't
-- buy a second post. The primary key is the claim: an insert that conflicts
-- means this account already posted today.
create table account_posts (
  venue_id uuid not null references venues (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  local_day date not null,
  created_at timestamptz not null default now(),
  primary key (venue_id, user_id, local_day)
);

alter table account_posts enable row level security;

-- Server only, like the other counting tables (docs/ERD.md, Data API grants).
grant select, insert, update, delete on table account_posts to service_role;
