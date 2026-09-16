-- Storage bucket for tile drawings. Tiles are WebP (docs/PLAN.md, Tech stack).
--
-- Public, so board pages load images straight from the storage CDN without
-- signing a URL per tile. File names are random UUIDs, and removing or purging
-- a tile deletes its file, so a public URL stops working once a tile is gone.
--
-- No storage.objects policies: uploads and deletes happen server-side with the
-- service role, which bypasses RLS, and public reads don't go through policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tiles', 'tiles', true, 1048576, array['image/webp']);
