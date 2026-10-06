-- Indexes for the foreign keys that had none (performance pass, 2026-10-06;
-- flagged by Supabase's performance advisor).
--
-- Without an index, every delete on the referenced table (an account deleted,
-- a device cleaned up, a tile removed) scans the whole referencing table to
-- check the key, and lookups by these columns (an account's votes, a
-- device's tiles) do the same. Each is a plain btree on the foreign key
-- column. The tables are small enough at launch that building them in the
-- migration's transaction is quick, so CONCURRENTLY isn't needed.

create index if not exists account_posts_user_id_idx
  on public.account_posts (user_id);

create index if not exists final_votes_user_id_idx
  on public.final_votes (user_id);

create index if not exists monthly_finals_winner_tile_id_idx
  on public.monthly_finals (winner_tile_id);

create index if not exists post_attempts_device_id_idx
  on public.post_attempts (device_id);

create index if not exists tile_reports_user_id_idx
  on public.tile_reports (user_id);

create index if not exists tiles_device_id_idx
  on public.tiles (device_id);

create index if not exists venue_artists_user_id_idx
  on public.venue_artists (user_id);

create index if not exists venue_blocks_user_id_idx
  on public.venue_blocks (user_id);

create index if not exists votes_user_id_idx
  on public.votes (user_id);
