-- Blocking an account from a board (ADR-008).
--
-- A blocked account can't post, vote, vote in a final or report on that
-- board. The app checks first, to say so before any work is done; these
-- triggers are where it can't be bypassed, the same way the voting rules
-- live in a trigger (20260918040000_account_voting.sql).

create table venue_blocks (
  venue_id uuid not null references venues (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (venue_id, user_id)
);

comment on table venue_blocks is
  'Accounts a board''s owner has blocked from posting, voting and reporting there.';

-- Server only: who an owner has blocked is between them and the board.
alter table venue_blocks enable row level security;
grant select, insert, update, delete on venue_blocks to service_role;

create function public.is_blocked(p_venue_id uuid, p_user_id uuid)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from venue_blocks
     where venue_id = p_venue_id and user_id = p_user_id
  );
$$;

revoke all on function public.is_blocked(uuid, uuid) from public;
grant execute on function public.is_blocked(uuid, uuid) to service_role;

-- One message for every refusal, matched in the app to say "you can't take
-- part in this board" without naming the owner or a reason.
create function public.refuse_blocked_account()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_venue_id uuid;
begin
  if new.user_id is null then
    return new;
  end if;

  if tg_table_name = 'tiles' then
    select venue_id into v_venue_id from weeks where id = new.week_id;
  elsif tg_table_name = 'votes' then
    select venue_id into v_venue_id from weeks where id = new.week_id;
  elsif tg_table_name = 'final_votes' then
    select venue_id into v_venue_id from monthly_finals where id = new.final_id;
  elsif tg_table_name = 'tile_reports' then
    select w.venue_id into v_venue_id
      from tiles t join weeks w on w.id = t.week_id
     where t.id = new.tile_id;
  end if;

  if is_blocked(v_venue_id, new.user_id) then
    raise exception 'account % is blocked from this board', new.user_id;
  end if;
  return new;
end;
$$;

-- Named so they fire before the *_enforce_rules triggers (Postgres runs
-- triggers in name order): a blocked account hears it is blocked, not some
-- other rule its vote happened to break.
create trigger tiles_check_block
  before insert on tiles
  for each row execute function public.refuse_blocked_account();

create trigger votes_check_block
  before insert on votes
  for each row execute function public.refuse_blocked_account();

create trigger final_votes_check_block
  before insert on final_votes
  for each row execute function public.refuse_blocked_account();

create trigger tile_reports_check_block
  before insert on tile_reports
  for each row execute function public.refuse_blocked_account();

notify pgrst, 'reload schema';
