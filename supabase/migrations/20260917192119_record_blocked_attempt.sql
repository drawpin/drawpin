-- Counts a moderation-blocked posting attempt and returns the day's new total
-- (docs/PLAN.md, Moderation: 3 blocked attempts lock the device until the next
-- 4:00 AM reset).
--
-- One statement, so two blocked attempts arriving together can't both read the
-- same count and write the same value back — which would let a device keep
-- posting past the limit.
create function public.record_blocked_attempt(
  p_venue_id uuid,
  p_device_id uuid,
  p_local_day date
) returns integer
language sql
security definer
set search_path = ''
as $$
  insert into public.post_attempts (venue_id, device_id, local_day, blocked_count)
  values (p_venue_id, p_device_id, p_local_day, 1)
  on conflict (venue_id, device_id, local_day) do update
    set blocked_count = public.post_attempts.blocked_count + 1
  returning blocked_count;
$$;

-- Only the server calls this; post_attempts itself stays closed to the API
-- roles (docs/ERD.md, Data API grants).
revoke all on function public.record_blocked_attempt(uuid, uuid, date) from public;
grant execute on function public.record_blocked_attempt(uuid, uuid, date) to service_role;
