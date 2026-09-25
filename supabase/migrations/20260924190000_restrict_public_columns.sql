-- Least-privilege columns for the public Data API and Realtime.
--
-- The board is served to the anon role with a table-wide SELECT grant
-- (20260917005943_grant_data_api_access.sql), so a direct PostgREST call, or a
-- Realtime subscription, can read columns the board itself never shows:
-- tiles.device_id and venues.owner_id. A grant decides which columns a role may
-- read at all; RLS only decides which rows. This narrows the column grant to
-- what the board actually needs.
--
-- Column-level SELECT is enforced by both readers: PostgREST refuses a request
-- for an ungranted column, and Realtime nulls an ungranted column in the change
-- payload — so this closes the Data API and the live feed at once.

-- tiles: drop device_id from the public grant. It is the per-device identifier
-- that links one guest's drawings together across weeks, and guests are
-- promised anonymity (docs/PLAN.md, Domain rules; privacy policy). Nothing on
-- the read side needs it: the server never selects it, and the Realtime row
-- schema (src/app/b/[slug]/tiles.ts) doesn't include it.
--
-- user_id stays granted. The board already shows a signed-in author as
-- "username#tag", so their tiles are attributable regardless, and it is null
-- for guests — so it reveals nothing the tile doesn't already. The app needs it
-- to tell guest tiles apart and to mark the viewer's own tile.
revoke select on public.tiles from anon, authenticated;
grant select (
  id, week_id, user_id, display_name, name_tag, caption, image_path,
  status, created_at
) on public.tiles to anon, authenticated;

-- venues: drop owner_id, the owner's auth user id, which let anyone enumerate
-- every board and the account behind it. getBoard (src/app/b/[slug]/data.ts)
-- reads only these columns, and filters on slug, so slug stays granted.
revoke select on public.venues from anon, authenticated;
grant select (id, name, slug, timezone, is_paused) on public.venues
  to anon, authenticated;

-- Have PostgREST pick up the narrowed privileges immediately.
notify pgrst, 'reload schema';
