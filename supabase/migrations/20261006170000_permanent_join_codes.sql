-- A board keeps one 8-digit join code until its owner makes a new one
-- (ADR-014). The table keeps its name and shape: a live code is now a row
-- whose valid_until is 'infinity', and replacing a code closes that row at
-- the moment of the change. Lookups by code are unchanged: a code works while
-- valid_from <= now < valid_until.

-- Today's code becomes the permanent one, so nobody who already has it is
-- locked out. Only the end of each live row moves, so the exclusion
-- constraint can't trip: no code row starts after today's.
update public.daily_codes
   set valid_until = 'infinity'
 where valid_from <= now() and valid_until > now();

-- One code per venue per day no longer means anything. In its place: one
-- live code per venue, so two first views of /admin can't each create one.
alter table public.daily_codes drop constraint daily_codes_one_per_window;

create unique index daily_codes_one_live_per_venue
  on public.daily_codes (venue_id)
  where valid_until = 'infinity';

comment on table public.daily_codes is
  'Board join codes: one live (open-ended) 8-digit code per venue, kept until the owner replaces it.';

drop function public.ensure_daily_code(uuid, timestamptz, timestamptz);

-- Returns the venue's live code, creating it on the first ask (ADR-003: on
-- demand, no cron).
--
-- Retries on a code that's already live at another venue, which the exclusion
-- constraint rejects. A conflict on this venue's own live code means another
-- request won the race, so that code is returned rather than a second one made.
create function public.ensure_join_code(p_venue_id uuid)
returns char(8)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing char(8);
  v_code char(8);
begin
  select code into v_existing from public.daily_codes
   where venue_id = p_venue_id and valid_until = 'infinity';
  if found then return v_existing; end if;

  for attempt in 1..20 loop
    v_code := lpad((floor(random() * 100000000))::bigint::text, 8, '0');

    begin
      insert into public.daily_codes (venue_id, code, valid_from, valid_until)
      values (p_venue_id, v_code, now(), 'infinity');
      return v_code;
    exception
      when unique_violation then
        select code into v_existing from public.daily_codes
         where venue_id = p_venue_id and valid_until = 'infinity';
        if found then return v_existing; end if;
      when exclusion_violation then
        -- The code is live at another venue right now; try another one.
        null;
    end;
  end loop;

  raise exception 'could not allocate a join code for venue %', p_venue_id;
end;
$$;

revoke all on function public.ensure_join_code(uuid) from public;
grant execute on function public.ensure_join_code(uuid) to service_role;

-- Replaces the venue's code: the old one stops working at once and a new,
-- different one takes over, in one transaction (ADR-014).
--
-- The venue row is locked first so two replacements for one board run one
-- after the other instead of racing for the one live slot.
create function public.replace_join_code(p_venue_id uuid)
returns char(8)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old char(8);
  v_code char(8);
begin
  perform 1 from public.venues where id = p_venue_id for update;
  if not found then
    raise exception 'venue % not found', p_venue_id
      using errcode = 'no_data_found';
  end if;

  -- A code that starts at now() (made earlier in this same transaction)
  -- can't be closed at now(): valid_until must be after valid_from. Nobody
  -- can have used it yet, so it is deleted instead.
  delete from public.daily_codes
   where venue_id = p_venue_id and valid_until = 'infinity'
     and valid_from >= now()
  returning code into v_old;

  if v_old is null then
    update public.daily_codes
       set valid_until = now()
     where venue_id = p_venue_id and valid_until = 'infinity'
    returning code into v_old;
  end if;

  for attempt in 1..20 loop
    v_code := lpad((floor(random() * 100000000))::bigint::text, 8, '0');
    -- The old code no longer overlaps the new one in time, so the exclusion
    -- constraint would let it straight back in.
    continue when v_code = v_old;

    begin
      insert into public.daily_codes (venue_id, code, valid_from, valid_until)
      values (p_venue_id, v_code, now(), 'infinity');
      return v_code;
    exception
      when exclusion_violation then
        -- The code is live at another venue right now; try another one.
        null;
    end;
  end loop;

  raise exception 'could not allocate a join code for venue %', p_venue_id;
end;
$$;

revoke all on function public.replace_join_code(uuid) from public;
grant execute on function public.replace_join_code(uuid) to service_role;
