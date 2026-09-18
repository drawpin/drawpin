-- Burst protection for posting (docs/PLAN.md, Device limiting).
--
-- IP is only ever used to spot a burst — many posts from one network in a few
-- minutes — never as a one-post-per-IP rule: everyone on a cafe's Wi-Fi shares
-- one public address. Only the keyed hash is stored, never the address itself.

create index devices_last_ip_hash_idx on public.devices (last_ip_hash);

-- Counts recent posts from the devices last seen on this network. A device
-- that has since moved to another network stops counting, which is what we
-- want: this measures what one network is doing right now.
create function public.count_recent_posts_from_ip(
  p_ip_hash text,
  p_since timestamptz
) returns integer
language sql
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.tiles t
  join public.devices d on d.id = t.device_id
  where d.last_ip_hash = p_ip_hash
    and t.created_at >= p_since;
$$;

-- Only the server calls this; devices and tiles stay closed to the API roles
-- for this kind of lookup (docs/ERD.md, Data API grants).
revoke all on function public.count_recent_posts_from_ip(text, timestamptz) from public;
grant execute on function public.count_recent_posts_from_ip(text, timestamptz) to service_role;
