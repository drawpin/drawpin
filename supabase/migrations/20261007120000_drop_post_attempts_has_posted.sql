-- Drop post_attempts.has_posted.
--
-- The daily post limit is per account only (docs/PLAN.md v19, PR #190): a
-- signed-in post claims a row in account_posts. post_attempts now only counts
-- blocked attempts per device per day, so has_posted is never read or written.
--
-- Safe to run while the previous app version is live: no application code, RPC
-- (record_blocked_attempt only touches blocked_count), trigger, view or policy
-- references the column.

alter table public.post_attempts drop column if exists has_posted;

comment on table public.post_attempts is
  'Per-device daily count of blocked posting attempts.';

notify pgrst, 'reload schema';
