-- Changing a board's time zone (ADR-008).
--
-- A change takes over when the posting week it was made in ends, so no week
-- already under way moves. Until then the board keeps its zone; from then on
-- next_timezone is in force. The app works out every boundary around the
-- change (src/lib/venue-time.ts, weekBoundsAt); the database only stores it.
alter table venues
  add column next_timezone text,
  add column timezone_changes_at timestamptz,
  add constraint venues_timezone_change_complete check (
    (next_timezone is null) = (timezone_changes_at is null)
  );

comment on column venues.next_timezone is
  'The time zone the board changes to at timezone_changes_at, or null.';

-- Board pages read the zone through the public client, like timezone.
grant select (next_timezone, timezone_changes_at) on venues
  to anon, authenticated;

-- Stores a board's clock, and moves the voting end of the week taking posts
-- now: the week a change is made in votes until the first week in the new
-- zone stops taking posts, so two weeks are never open for voting at once.
-- Cancelling a change puts it back. One transaction, so the board's zone and
-- its week never disagree. The week may not exist yet, if nobody has posted.
create function public.set_venue_clock(
  p_venue_id uuid,
  p_timezone text,
  p_next_timezone text,
  p_timezone_changes_at timestamptz,
  p_week_posting_ends_at timestamptz,
  p_week_voting_ends_at timestamptz
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  update venues
     set timezone = p_timezone,
         next_timezone = p_next_timezone,
         timezone_changes_at = p_timezone_changes_at
   where id = p_venue_id;
  if not found then
    raise exception 'venue % not found', p_venue_id
      using errcode = 'no_data_found';
  end if;

  update weeks
     set voting_ends_at = p_week_voting_ends_at
   where venue_id = p_venue_id
     and posting_ends_at = p_week_posting_ends_at;
end;
$$;

revoke all on function public.set_venue_clock(uuid, text, text, timestamptz, timestamptz, timestamptz) from public;
grant execute on function public.set_venue_clock(uuid, text, text, timestamptz, timestamptz, timestamptz) to service_role;

notify pgrst, 'reload schema';
