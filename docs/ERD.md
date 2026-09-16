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
| `fingerprint_hash` | `text` | nullable |
| `last_ip_hash` | `text` | nullable |
| `first_seen_at` | `timestamptz` | |

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

Live vote tallies stay unreadable on purpose — the top 7 is only revealed once
the week closes.
