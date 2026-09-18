-- Signed-in customers can flag a tile for the owner (docs/PLAN.md, Moderation).
--
-- Automatic moderation doesn't catch everything — a drawn hate symbol is the
-- obvious gap — and until now an owner had to notice a bad tile themselves.

create type report_reason as enum (
  'offensive',
  'sexual',
  'violent',
  'spam',
  'other'
);

create table tile_reports (
  id uuid primary key default gen_random_uuid(),
  tile_id uuid not null references tiles (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  reason report_reason not null,
  created_at timestamptz not null default now(),
  -- Set when the owner acts on it, by removing the tile or dismissing it.
  resolved_at timestamptz,
  -- Reporting needs an account so one person can't file the same report over
  -- and over by clearing their cookies.
  unique (tile_id, user_id)
);

-- The owner screen only ever asks for what's still open.
create index tile_reports_open_idx on tile_reports (tile_id)
  where resolved_at is null;

alter table tile_reports enable row level security;

-- Server only: reports name the account that filed them, and the owner reads
-- them through the service role (docs/ERD.md, Data API grants).
grant select, insert, update, delete on table tile_reports to service_role;

-- Reports one tile, and says what happened.
create function public.record_tile_report(
  p_tile_id uuid,
  p_user_id uuid,
  p_reason report_reason
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent int;
  v_inserted int;
begin
  -- A flood of reports from one account would bury the owner's queue, which
  -- is the only thing standing between a bad tile and the board.
  select count(*) into v_recent
  from public.tile_reports
  where user_id = p_user_id and created_at > now() - interval '1 day';

  if v_recent >= 10 then return 'rate-limited'; end if;

  insert into public.tile_reports (tile_id, user_id, reason)
  values (p_tile_id, p_user_id, p_reason)
  on conflict (tile_id, user_id) do nothing;

  get diagnostics v_inserted = row_count;
  return case when v_inserted = 0 then 'already-reported' else 'recorded' end;
end;
$$;

revoke all on function public.record_tile_report(uuid, uuid, report_reason) from public;
grant execute on function public.record_tile_report(uuid, uuid, report_reason) to service_role;
