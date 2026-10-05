-- All-time counts for a board's stats line.
--
-- board_stats counted what the board still holds, so "artists" and
-- "drawings" fell whenever the 30-day clean-up deleted old tiles, though
-- those people did take part. Counting from tiles can't fix that, since the
-- rows are gone, so a running tally is kept as tiles are posted instead.
--
-- - Every posted tile adds a drawing. A tile the owner removes takes it
--   back: a moderated drawing isn't part of the board. The clean-up and
--   account deletion don't, because those drawings did happen.
-- - An account adds an artist the first time it posts on a board, recorded
--   in venue_artists. If the account is deleted its row goes, but the
--   artist stays counted.
-- - Existing boards start from what they hold now: history already cleaned
--   up can't be recovered.

create table venue_tallies (
  venue_id uuid primary key references venues (id) on delete cascade,
  drawings bigint not null default 0 check (drawings >= 0),
  artists bigint not null default 0 check (artists >= 0)
);

create table venue_artists (
  venue_id uuid not null references venues (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  primary key (venue_id, user_id)
);

comment on table venue_tallies is 'All-time drawing and artist counts per board, kept as tiles are posted.';
comment on table venue_artists is 'Which accounts have ever posted on a board, so each is counted once.';

-- Internal bookkeeping: read through board_stats, written by triggers.
alter table venue_tallies enable row level security;
alter table venue_artists enable row level security;
grant select, insert, update, delete on venue_tallies to service_role;
grant select, insert, update, delete on venue_artists to service_role;

create function public.count_posted_tile()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_venue_id uuid;
  v_new_artist boolean := false;
begin
  select venue_id into v_venue_id from weeks where id = new.week_id;

  if new.user_id is not null then
    insert into venue_artists (venue_id, user_id)
    values (v_venue_id, new.user_id)
    on conflict do nothing;
    v_new_artist := found;
  end if;

  insert into venue_tallies (venue_id, drawings, artists)
  values (v_venue_id, 1, case when v_new_artist then 1 else 0 end)
  on conflict (venue_id) do update
    set drawings = venue_tallies.drawings + 1,
        artists = venue_tallies.artists + case when v_new_artist then 1 else 0 end;
  return new;
end;
$$;

create trigger tiles_count_posted
  after insert on tiles
  for each row execute function public.count_posted_tile();

create function public.uncount_removed_tile()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  update venue_tallies
     set drawings = greatest(drawings - 1, 0)
   where venue_id = (select venue_id from weeks where id = new.week_id);
  return new;
end;
$$;

create trigger tiles_uncount_removed
  after update of status on tiles
  for each row
  when (old.status = 'live' and new.status = 'removed')
  execute function public.uncount_removed_tile();

-- Backfill: what each board holds today.
insert into venue_artists (venue_id, user_id)
select distinct w.venue_id, t.user_id
  from tiles t join weeks w on w.id = t.week_id
 where t.status = 'live' and t.user_id is not null
on conflict do nothing;

insert into venue_tallies (venue_id, drawings, artists)
select w.venue_id,
       count(*),
       count(distinct coalesce('account:' || t.user_id::text,
                               'device:' || t.device_id::text))
  from tiles t join weeks w on w.id = t.week_id
 where t.status = 'live'
 group by w.venue_id
on conflict (venue_id) do nothing;

-- People and drawings are now all-time; this week's count is unchanged.
-- Signature, grants and SECURITY DEFINER stay as before.
create or replace function public.board_stats(p_venue_id uuid)
returns table (people bigint, total_drawings bigint, week_drawings bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce((select artists from venue_tallies where venue_id = p_venue_id), 0),
    coalesce((select drawings from venue_tallies where venue_id = p_venue_id), 0),
    (
      select count(*)
        from tiles t
        join weeks w on w.id = t.week_id
       where w.venue_id = p_venue_id
         and t.status = 'live'
         and w.starts_at <= now()
         and w.posting_ends_at > now()
    );
$$;

notify pgrst, 'reload schema';
