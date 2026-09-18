-- Joining by typing today's 8-digit code (docs/PLAN.md, Joining).

-- One code per venue per day. Without this, two requests arriving together on
-- the first view of /admin would each insert a code for the same window.
alter table daily_codes
  add constraint daily_codes_one_per_window unique (venue_id, valid_from);

-- Returns the venue's code for this window, creating it on the first ask
-- (ADR-003: on demand, no cron).
--
-- Retries on a code that's already live at another venue, which the exclusion
-- constraint rejects. A conflict on this venue's own window means another
-- request won the race, so that code is returned rather than a second one made.
create function public.ensure_daily_code(
  p_venue_id uuid,
  p_valid_from timestamptz,
  p_valid_until timestamptz
) returns char(8)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing char(8);
  v_code char(8);
begin
  select code into v_existing from public.daily_codes
   where venue_id = p_venue_id and valid_from = p_valid_from;
  if found then return v_existing; end if;

  for attempt in 1..20 loop
    v_code := lpad((floor(random() * 100000000))::bigint::text, 8, '0');

    begin
      insert into public.daily_codes (venue_id, code, valid_from, valid_until)
      values (p_venue_id, v_code, p_valid_from, p_valid_until);
      return v_code;
    exception
      when unique_violation then
        select code into v_existing from public.daily_codes
         where venue_id = p_venue_id and valid_from = p_valid_from;
        if found then return v_existing; end if;
      when exclusion_violation then
        -- The code is live at another venue right now; try another one.
        null;
    end;
  end loop;

  raise exception 'could not allocate a daily code for venue %', p_venue_id;
end;
$$;

revoke all on function public.ensure_daily_code(uuid, timestamptz, timestamptz) from public;
grant execute on function public.ensure_daily_code(uuid, timestamptz, timestamptz) to service_role;

-- Wrong code guesses per network, so an 8-digit code can't be ground through.
-- Only the hash of the address is stored, never the address (docs/ERD.md).
create table code_attempts (
  ip_hash text not null,
  window_start timestamptz not null,
  attempts integer not null default 0,
  primary key (ip_hash, window_start)
);

alter table code_attempts enable row level security;

-- Server-only, like the other counting tables (docs/ERD.md, Data API grants).
grant select, insert, update, delete on table code_attempts to service_role;

-- Counts a wrong guess and returns the window's new total, in one statement so
-- simultaneous guesses can't both read the same count and overwrite each other.
-- Windows that have rolled off are dropped on the way, so the table stays
-- small without a scheduled job.
create function public.record_code_attempt(
  p_ip_hash text,
  p_window_start timestamptz
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempts integer;
begin
  delete from public.code_attempts where window_start < p_window_start;

  insert into public.code_attempts (ip_hash, window_start, attempts)
  values (p_ip_hash, p_window_start, 1)
  on conflict (ip_hash, window_start) do update
    set attempts = public.code_attempts.attempts + 1
  returning attempts into v_attempts;

  return v_attempts;
end;
$$;

revoke all on function public.record_code_attempt(text, timestamptz) from public;
grant execute on function public.record_code_attempt(text, timestamptz) to service_role;
