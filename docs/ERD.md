# Database

The schema lives in `supabase/migrations/`. This page is the readable map of
it; the diagram is on
[Lucid](https://lucid.app/lucidchart/1e2f0c20-87e8-4065-9f7e-11c4fc2a4124/edit).

All day and week boundaries are 4:00 AM venue local time. The app computes them
from each venue's IANA `timezone` and stores absolute `timestamptz` values, so
the database never does timezone math.

## Tables

### `owners`
Venue owners, the only accounts in the product. Mirrors `auth.users`: a
trigger on `auth.users` inserts the row when someone signs up, so every
signed-in user has one.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, references `auth.users` |
| `email` | `text` | |
| `created_at` | `timestamptz` | |

### `venues`
One drawing board per owner, addressed publicly by `slug`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `owner_id` | `uuid` | FK → `owners`, **unique** — one board per owner |
| `name` | `text` | 1–120 chars |
| `slug` | `text` | unique, `^[a-z0-9]+(-[a-z0-9]+)*$` |
| `timezone` | `text` | IANA name, validated in the app |
| `is_paused` | `boolean` | owner's pause toggle |
| `created_at` | `timestamptz` | |

### `daily_codes`
The 8-digit code people type instead of scanning the QR, rotated daily.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `venue_id` | `uuid` | FK → `venues` |
| `code` | `char(8)` | digits only |
| `valid_from` / `valid_until` | `timestamptz` | `valid_until > valid_from` |

An exclusion constraint stops the same code being live at two venues at once,
so a typed code always resolves to exactly one venue. The generator retries on
conflict.

### `weeks`
A venue's weekly cycle: posting, then voting, then closed.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `venue_id` | `uuid` | FK → `venues`, unique with `starts_at` |
| `starts_at` | `timestamptz` | |
| `posting_ends_at` | `timestamptz` | `> starts_at` |
| `voting_ends_at` | `timestamptz` | `> posting_ends_at` |
| `status` | `week_status` | `posting` \| `voting` \| `closed` |
| `purge_after` | `timestamptz` | null until the week closes |

### `devices`
Visitor devices, identified by the signed device-ID cookie. Only hashes are
stored — never a raw IP or fingerprint.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, the value the cookie carries |
| `fingerprint_hash` | `text` | nullable; keyed hash, set the first time a fingerprint arrives and never overwritten. Indexed: with no valid cookie, a match reconnects a visitor to their device |
| `last_ip_hash` | `text` | nullable; keyed hash of the network last seen, indexed. Used only to spot bursts, never one post per IP |
| `first_seen_at` | `timestamptz` | oldest row wins when a fingerprint matches more than one device |

### `tiles`
A drawing plus optional caption and username, posted to one week.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `week_id` | `uuid` | FK → `weeks` |
| `device_id` | `uuid` | FK → `devices`, `on delete restrict` |
| `display_name` | `text` | null means anonymous |
| `name_tag` | `char(4)` | 4 digits; set together with `display_name` |
| `caption` | `varchar(80)` | nullable |
| `image_path` | `text` | Supabase Storage path |
| `status` | `tile_status` | `live` \| `removed` |
| `created_at` | `timestamptz` | |

### `votes`
Final votes cast during the following week. Three per device per week.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `week_id` | `uuid` | FK → `weeks` |
| `tile_id` | `uuid` | FK → `tiles` |
| `device_id` | `uuid` | FK → `devices`, `on delete restrict` |
| `created_at` | `timestamptz` | |

Unique on `(week_id, device_id, tile_id)`, so each of a device's three votes
lands on a different tile. A `before insert` trigger enforces the rest: at most
three votes per week, never on your own tile, and the vote's week must match
the tile's.

### `post_attempts`
The per-device daily posting budget.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `venue_id` | `uuid` | FK → `venues` |
| `device_id` | `uuid` | FK → `devices` |
| `local_day` | `date` | the venue-local day, not a UTC day |
| `blocked_count` | `int` | 3 blocked attempts lock the device until reset |
| `has_posted` | `boolean` | one post per device per day |

Unique on `(venue_id, device_id, local_day)`.

### `hall_of_fame`
The frozen top 7 of a finished week, kept forever.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `venue_id` | `uuid` | FK → `venues` |
| `week_id` | `uuid` | FK → `weeks`, unique with `rank` |
| `tile_id` | `uuid` | FK → `tiles`, unique, `on delete restrict` |
| `rank` | `smallint` | 1–7 |
| `vote_count` | `int` | |

`on delete restrict` is what stops the 30-day purge from deleting a winning
tile.

## Storage

Tile drawings live in the `tiles` bucket, referenced by `tiles.image_path`.

- **Public**, so boards load images straight from the storage CDN. File names
  are random UUIDs, and removing or purging a tile deletes its file.
- **WebP only**, up to **1 MB** per file.
- **No `storage.objects` policies**: uploads and deletes happen server-side
  with the service role, so the anon key can't write to the bucket.

## Realtime

`tiles` and `weeks` are in the `supabase_realtime` publication, so open boards
receive new tiles and new weeks as they're inserted. Realtime applies the RLS
policies below per subscriber, so visitors only receive rows they could
already read.

Only inserts are used. A tile changing status isn't pushed to visitors: once
removed, the row fails the "live tiles" policy, so Realtime won't send the
update to anon subscribers.

**Removal** therefore travels as a Realtime **broadcast** on the topic
`board:<venue_id>`, sent by the server with the service role when an owner
removes a tile. The payload is just the tile id, which is already public.
Open boards drop the tile immediately and keep it hidden through later
refreshes.

A removed tile's row is **kept**, not deleted, so a tile that already won a
week still satisfies `hall_of_fame`'s foreign key. Its image file is deleted,
so it can't be shown anywhere, including the Hall of Fame.

## Row level security

RLS is on for every table, and all writes go through API routes using the
service role key, which bypasses it. The policies only grant the reads the
public board and the owner screen need:

| Table | Readable by |
|---|---|
| `venues`, `weeks`, `hall_of_fame` | anyone |
| `tiles` | anyone, `status = 'live'` only |
| `owners` | the owner, their own row |
| `daily_codes` | the owner, for their own venue |
| `devices`, `votes`, `post_attempts` | nobody (service role only) |

Live vote tallies stay unreadable on purpose — winners are only revealed once
voting closes.

## Data API grants

Tables get **no** privileges for the API roles by default: the hosted project
has "Automatically expose new tables" turned off, and a migration turns the
local stack's grant-everything default off to match. Each table's privileges
are granted explicitly, and RLS then narrows the rows:

| Role | Tables | Privileges |
|---|---|---|
| `service_role` (server) | all | select, insert, update, delete |
| `anon`, `authenticated` | `venues`, `weeks`, `tiles`, `hall_of_fame` | select |
| `authenticated` (owners) | `owners`, `daily_codes` | select |
| `anon`, `authenticated` | `devices`, `votes`, `post_attempts` | none |

Functions follow the same rule. `record_blocked_attempt(venue_id, device_id,
local_day)` counts a moderation-blocked post and returns the day's new total in
one statement; execute is granted to `service_role` only, so `post_attempts`
stays closed to the API roles. `count_recent_posts_from_ip(ip_hash, since)`
counts recent posts from the devices last seen on one network, for burst
protection; same grant, since neither `devices` nor `tiles` can be joined this
way through the API.

**A new table must grant its privileges in the migration that creates it**,
or every query on it fails with `permission denied` (`42501`).
`supabase/schema.test.ts` checks this matrix and fails when a table is added
without updating it.
