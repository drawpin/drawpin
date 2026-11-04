-- Several boards per account (ADR-016) and remembered boards (ADR-015).
--
-- 1. venues.owner_id is no longer unique: an account can own up to five
--    boards. A trigger enforces the cap, so a double-submitted setup form or
--    a direct insert can't get past it.
-- 2. close_venue deletes the one board it is given. It used to delete the
--    owner row and let that cascade, which with several boards would take
--    every board the account owns.
-- 3. board_visits remembers the boards an account has opened, for the
--    sidebar and the home hub: one row per account and board, with pins and
--    "remove from my boards".

-- 1. The cap -----------------------------------------------------------------

alter table public.venues drop constraint if exists venues_owner_id_key;

-- The unique constraint was also the index behind every "the owner's board"
-- lookup and the cascade from owners; keep one.
create index if not exists venues_owner_id_idx on public.venues (owner_id);

comment on column public.venues.owner_id is
  'The account that runs the board. Up to five boards per account (ADR-016), enforced by venues_enforce_board_limit.';

-- Must agree with MAX_BOARDS_PER_ACCOUNT in src/lib/my-boards.ts: the app
-- hides "Start a board" at the cap, and this is what holds if it doesn't.
create function public.venues_enforce_board_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_max constant integer := 5;
  v_count integer;
begin
  -- Locking the owner row serialises board creation per account: without it
  -- two inserts arriving together would each count four boards and each go
  -- ahead. Other accounts aren't held up.
  perform 1 from owners where id = new.owner_id for update;

  select count(*) into v_count
  from venues
  where owner_id = new.owner_id
    and id <> new.id;

  if v_count >= v_max then
    raise exception 'An account can run at most % boards', v_max
      using errcode = 'check_violation',
            constraint = 'venues_board_limit',
            hint = 'Close a board before starting another.';
  end if;

  return new;
end;
$$;

revoke all on function public.venues_enforce_board_limit() from public;

create trigger venues_enforce_board_limit
  before insert or update of owner_id on public.venues
  for each row execute function public.venues_enforce_board_limit();

-- 2. Closing one board -------------------------------------------------------

-- Same contract as before (ADR-009): the board and everything on it, Hall of
-- Fame first since hall_of_fame.tile_id is ON DELETE RESTRICT, in one
-- transaction. The owner row goes only with the account's last board, so an
-- account with other boards keeps them. Images and the sign-in are still the
-- app's to delete (src/app/admin/close-board.ts).
create or replace function public.close_venue(p_venue_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_owner_id uuid;
begin
  select owner_id into v_owner_id from venues where id = p_venue_id for update;
  if not found then
    raise exception 'venue % not found', p_venue_id
      using errcode = 'no_data_found';
  end if;

  -- The same lock the board cap takes, so a board being created alongside
  -- can't leave an owner row deleted from under it.
  perform 1 from owners where id = v_owner_id for update;

  delete from hall_of_fame where venue_id = p_venue_id;
  delete from venues where id = p_venue_id;

  if not exists (select 1 from venues where owner_id = v_owner_id) then
    delete from owners where id = v_owner_id;
  end if;
end;
$$;

-- 3. Remembered boards -------------------------------------------------------

create table public.board_visits (
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  last_visited_at timestamptz not null default now(),
  -- Set while the board is pinned to the top of the account's list (up to
  -- five, enforced in the app); pinned boards are ordered by it.
  pinned_at timestamptz,
  -- Set by "Remove from my boards"; opening the board again clears it.
  hidden_at timestamptz,
  primary key (user_id, venue_id)
);

comment on table public.board_visits is
  'Boards an account has opened, for its sidebar and home hub (ADR-015). Private to the account; a closed board''s rows cascade away.';

-- "My boards": an account's visible rows, pinned first, then most recent.
create index board_visits_my_boards_idx
  on public.board_visits (user_id, pinned_at asc nulls last, last_visited_at desc)
  where hidden_at is null;

-- The foreign key from venues: closing a board deletes its visits.
create index board_visits_venue_id_idx on public.board_visits (venue_id);

alter table public.board_visits enable row level security;

create policy "Accounts read their own board visits"
  on public.board_visits for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Accounts record their own board visits"
  on public.board_visits for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Accounts update their own board visits"
  on public.board_visits for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Accounts delete their own board visits"
  on public.board_visits for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Signed-in accounts only: a signed-out device keeps its list on the device.
grant select, insert, update, delete on public.board_visits to authenticated;
grant select, insert, update, delete on public.board_visits to service_role;

notify pgrst, 'reload schema';
