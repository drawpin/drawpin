-- Changing a board's link (ADR-008).
--
-- A board's slug is printed under every QR code it has ever had, so a slug
-- that has been replaced must keep working. Former slugs are kept here for
-- good and the app redirects them to the board's current one.

create table former_slugs (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  venue_id uuid not null references venues (id) on delete cascade,
  retired_at timestamptz not null default now()
);

create index former_slugs_venue_id_idx on former_slugs (venue_id);

comment on table former_slugs is
  'Slugs a board used to have. They redirect to its current slug and are never given to another board.';

-- Public, like venues: an old link is opened by anyone holding it, and the
-- only thing it reveals is which public board it now points to.
alter table former_slugs enable row level security;

create policy "Former slugs are publicly readable"
  on former_slugs for select
  to anon, authenticated
  using (true);

grant select on former_slugs to anon, authenticated;
grant select, insert, update, delete on former_slugs to service_role;

-- A slug is one namespace across both tables. If a new board could take a
-- slug another board has given up, the old board's printed QR codes would
-- open the new board instead. A unique index can't span two tables, so each
-- side checks the other, under a per-slug advisory lock so two writers can't
-- both pass the check.
--
-- The error is raised as unique_violation naming venues_slug_key, the same
-- thing a clash between two current slugs raises, so callers that retry with
-- a fresh suffix (createVenue, changeVenueSlug) handle both alike.
create function public.check_slug_not_retired()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtext('slug:' || new.slug));
  if exists (select 1 from former_slugs where slug = new.slug) then
    raise exception 'duplicate key value violates unique constraint "venues_slug_key"'
      using errcode = 'unique_violation',
            detail = format('%s belonged to another board.', new.slug);
  end if;
  return new;
end;
$$;

create trigger venues_slug_not_retired
  before insert or update of slug on venues
  for each row execute function public.check_slug_not_retired();

create function public.check_slug_not_current()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtext('slug:' || new.slug));
  if exists (select 1 from venues where slug = new.slug) then
    raise exception 'duplicate key value violates unique constraint "venues_slug_key"'
      using errcode = 'unique_violation',
            detail = format('%s is a board''s current slug.', new.slug);
  end if;
  return new;
end;
$$;

create trigger former_slugs_not_current
  before insert or update of slug on former_slugs
  for each row execute function public.check_slug_not_current();

-- Moves a board to a new slug and keeps the old one as a redirect, in one
-- transaction: a board must never be left with neither. The venue row is
-- locked so two changes at once can't each retire the same slug.
create function public.change_venue_slug(p_venue_id uuid, p_new_slug text)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_old_slug text;
begin
  select slug into v_old_slug from venues where id = p_venue_id for update;
  if not found then
    raise exception 'venue % not found', p_venue_id
      using errcode = 'no_data_found';
  end if;

  -- The venue moves first, so the old slug is free when it's retired.
  update venues set slug = p_new_slug where id = p_venue_id;
  insert into former_slugs (slug, venue_id) values (v_old_slug, p_venue_id);
end;
$$;

revoke all on function public.change_venue_slug(uuid, text) from public;
grant execute on function public.change_venue_slug(uuid, text) to service_role;

notify pgrst, 'reload schema';
