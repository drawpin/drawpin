-- Explicit Data API privileges for every table.
--
-- The hosted project has "Automatically expose new tables" turned off, so
-- tables get no privileges for the API roles unless a migration grants them.
-- The local stack grants everything by default, which hid that our earlier
-- migrations never granted anything. This migration makes both behave the
-- same: defaults off, and least-privilege grants per table.
--
-- Grants decide which operations a role may attempt at all; the RLS policies
-- in the initial migration still decide which rows it sees. Tables without
-- a public or owner policy get no anon/authenticated grants either, so they
-- stay closed even if a policy were added by mistake.
--
-- Every new table needs its own grants in the migration that creates it.

-- Future tables created by migrations get no API privileges by default.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;

-- Start from nothing on existing tables.
revoke all on all tables in schema public from anon, authenticated, service_role;

-- The server writes everything through the service role (docs/ERD.md).
grant select, insert, update, delete on
  public.owners,
  public.venues,
  public.daily_codes,
  public.weeks,
  public.devices,
  public.tiles,
  public.votes,
  public.post_attempts,
  public.hall_of_fame
to service_role;

-- Public board data: readable by visitors and owners alike (subject to RLS,
-- e.g. only live tiles). Also required for Realtime on tiles and weeks.
grant select on
  public.venues,
  public.weeks,
  public.tiles,
  public.hall_of_fame
to anon, authenticated;

-- Owner-only reads, narrowed to the owner's own rows by RLS.
grant select on public.owners, public.daily_codes to authenticated;

-- Have PostgREST pick up the new privileges immediately.
notify pgrst, 'reload schema';
