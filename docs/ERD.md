# Database

The schema lives in `supabase/migrations/`. This page is the readable map of
it; a visual ER diagram is kept privately in Lucidchart.

All day and week boundaries are 4:00 AM venue local time. The app computes them
from each venue's IANA `timezone` and stores absolute `timestamptz` values, so
the database never does timezone math.

## Tables

### `owners`
Venue owners. Mirrors `auth.users`, but only for people who actually own a
board: the row is created when a venue is set up, not when someone signs in,
because customers sign in too (ADR-004) and aren't owners.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, references `auth.users` |
| `email` | `text` | |
| `created_at` | `timestamptz` | |

### `profiles`
Customers (ADR-004). The counterpart to `owners`: an account has one or the
other, never both, which is how the app tells a venue owner from a customer.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, references `auth.users` |
| `username` | `text` | 1–40 characters, not unique |
| `created_at` | `timestamptz` | |

### `venues`
One drawing board per owner, addressed publicly by `slug`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `owner_id` | `uuid` | FK → `owners`, **unique** — one board per owner |
| `name` | `text` | 1–120 chars; the owner can change it, and nothing denormalizes a copy |
| `slug` | `text` | unique, `^[a-z0-9]+(-[a-z0-9]+)*$`; never one in `former_slugs` |
| `timezone` | `text` | IANA name, validated in the app |
| `next_timezone` | `text` | nullable; the zone a scheduled change switches to |
| `timezone_changes_at` | `timestamptz` | nullable, set with `next_timezone`; when it takes over |
| `is_paused` | `boolean` | owner's pause toggle |
| `created_at` | `timestamptz` | |

A time zone change (ADR-008) takes over when the posting week it was made in
ends, so no week under way moves. The app works out every boundary around it
(`weekBoundsAt` in `src/lib/venue-time.ts`): the week the change was made in
votes until the first new-zone week stops taking posts, and that first week
runs from the change to the new zone's Monday 4:00 AM nearest a week later.
`set_venue_clock(...)` stores a change, or cancels one, and moves that week's
`voting_ends_at` to match in the same transaction; `service_role` only.

### `former_slugs`
Slugs a board used to have (ADR-008). Every printed QR code encodes a slug, so
when an owner changes the link the old one is kept here and board pages
redirect it to the current one.

| Column | Type | Notes |
|---|---|---|
| `slug` | `text` | PK, same pattern as `venues.slug` |
| `venue_id` | `uuid` | FK → `venues`, `on delete cascade` |
| `retired_at` | `timestamptz` | |

A slug is one namespace across this table and `venues.slug`: a trigger on each
side refuses a slug the other holds, under a per-slug advisory lock, and raises
the same `venues_slug_key` unique violation a clash between two current slugs
does. Without it a new board could take a retired slug and inherit another
board's printed codes.

`change_venue_slug(venue_id, new_slug)` moves a board and retires its old slug
in one transaction; `service_role` only.

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
conflict. A second constraint, `daily_codes_one_per_window`, allows only one
code per venue per day, so two first views of `/admin` can't each create one.

### `weeks`
A venue's weekly cycle: posting, then voting, then closed.

The phase is **derived from these timestamps**, never stored: nothing runs at
4:00 AM in each venue's time zone to change a column, so a stored status would
sit at its creation value for ever (ADR-003). `src/lib/week-phase.ts` is the
one place that reads the clock, and the board selects the week whose range
contains now.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `venue_id` | `uuid` | FK → `venues`, unique with `starts_at` |
| `starts_at` | `timestamptz` | |
| `posting_ends_at` | `timestamptz` | `> starts_at` |
| `voting_ends_at` | `timestamptz` | `> posting_ends_at` |

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
| `user_id` | `uuid` | FK → `profiles`, nullable, `on delete set null`. Null is a guest tile from before ADR-007: shown on the board, never votable, never eligible to win. New tiles always have one |
| `display_name` | `text` | null means anonymous |
| `name_tag` | `char(4)` | 4 digits; set together with `display_name` |
| `caption` | `varchar(80)` | nullable |
| `image_path` | `text` | Supabase Storage path |
| `status` | `tile_status` | `live` \| `removed` |
| `created_at` | `timestamptz` | |

A customer deleting their account (docs/PLAN.md, Accounts) goes through
`delete_account_tiles(user_id)`: it takes the name and account off their
winners (`account_winning_tile_ids`: Hall of Fame and super winners), which
stay, and deletes the rest of their tiles, in one transaction. The app deletes
their images before it and the auth user after it; the profile, votes, final
votes, reports, blocks and daily post records cascade from that. Both
functions are `service_role` only.

### `votes`
Final votes cast during the following week. Three per **account** per week, so
they follow the person rather than the browser (ADR-004).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `week_id` | `uuid` | FK → `weeks` |
| `tile_id` | `uuid` | FK → `tiles` |
| `user_id` | `uuid` | FK → `profiles`, `on delete cascade` |
| `created_at` | `timestamptz` | |

Unique on `(week_id, user_id, tile_id)`, so each of an account's three votes
lands on a different tile. A `before insert` trigger enforces the rest, and is
the only place these rules can't be bypassed:

- the week must be in its voting window, derived from its own timestamps;
- the tile must be live, in that week, and posted by an account — guest tiles
  are shown on the voting screen but can never be picked;
- never your own tile;
- at most three votes per account per week.

The trigger takes a transaction-scoped advisory lock on `(week_id, user_id)`
before counting. Without it three requests arriving together each read "two
used" and each insert, and an account ends up with more votes than it has.

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

### `account_posts`
The daily limit for signed-in posting. A signed-in post claims a row here as
well as its device's row in `post_attempts`, so a second device doesn't buy a
second post. The primary key *is* the claim: an insert that conflicts means
this account already posted to this venue today.

| Column | Type | Notes |
|---|---|---|
| `venue_id` | `uuid` | PK with `user_id` and `local_day` |
| `user_id` | `uuid` | FK → `profiles`, `on delete cascade` |
| `local_day` | `date` | venue-local day, 4:00 AM boundary |
| `created_at` | `timestamptz` | |

### `monthly_finals`
A month's run-off between its weekly winners, and the super winner it crowns
(docs/PLAN.md, Monthly super winner).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `venue_id` | `uuid` | FK → `venues`, unique with `month` |
| `month` | `date` | first day of the venue-local month being judged |
| `starts_at` / `ends_at` | `timestamptz` | the one-week window, `ends_at > starts_at` |
| `winner_tile_id` | `uuid` | FK → `tiles`, null until it closes, or if nothing wins |
| `winner_vote_count` | `int` | votes the super winner had |

The window itself is **derived from the venue's weeks**, not stored first: a
week belongs to the month its Monday falls in, and the final opens when the
last of that month's weeks finishes voting, then runs a week
(`src/lib/monthly-final.ts`). The row is created the first time someone opens
the final, by `ensure_monthly_final(venue_id, month, starts_at, ends_at)`,
which returns the existing row on a conflict so two first views open one final.

`list_finalists(final_id)` returns that month's weekly winners, up to four,
most-voted in their own weeks first and ties to the earlier post. A tile the
owner has since removed drops out.

`finalize_super_winner(final_id)` crowns the month once the window has passed:
the most final votes wins, ties to the earlier post, a lone finalist wins
without a vote, and a real contest nobody voted in crowns nobody. It takes an
advisory lock and is safe to call again, like the weekly equivalent.

`week_podium(week_id)` and `final_podium(final_id)` return the top three of a
closed week or final with their vote counts, for the board's winners reveal.
They return nothing while voting is open, rank exactly as the crowning
functions do, and are `service_role` only.

### `final_votes`
One vote per account per final.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `final_id` | `uuid` | FK → `monthly_finals`, unique with `user_id` |
| `tile_id` | `uuid` | FK → `tiles` |
| `user_id` | `uuid` | FK → `profiles` |
| `created_at` | `timestamptz` | |

Unlike weekly voting there is nothing to count, so the unique pair is the whole
limit and no lock is needed. A `before insert` trigger adds the rest: the final
must be open, the tile must be one of its finalists, and never your own.

### `tile_reports`
Tiles customers have flagged for the owner (docs/PLAN.md, Moderation).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `tile_id` | `uuid` | FK → `tiles`, unique with `user_id` |
| `user_id` | `uuid` | FK → `profiles` — reporting needs an account |
| `reason` | `report_reason` | offensive, sexual, violent, spam, other |
| `created_at` | `timestamptz` | |
| `resolved_at` | `timestamptz` | null until the owner removes the tile or dismisses it |

A report is a flag, not a takedown: nothing is hidden automatically, so a
handful of accounts cannot bury a drawing they simply dislike. The unique pair
means one account can report a tile once, and `record_tile_report` turns down
an account that has filed ten reports in a day, since a flooded queue is as
good as no queue.

### `venue_blocks`
Accounts a board's owner has blocked (ADR-008).

| Column | Type | Notes |
|---|---|---|
| `venue_id` | `uuid` | PK with `user_id`; FK → `venues`, `on delete cascade` |
| `user_id` | `uuid` | FK → `profiles`, `on delete cascade` |
| `created_at` | `timestamptz` | |

A blocked account can't post, vote, vote in a final or report on that board.
`<table>_check_block` triggers on `tiles`, `votes`, `final_votes` and
`tile_reports` refuse it with one message the app matches; they're named to
fire before the `*_enforce_rules` triggers, so a blocked account is told it's
blocked rather than some other rule. `is_blocked(venue_id, user_id)` lets the
app check first; `service_role` only.

Blocking also removes every live tile the account has on the board, one at a
time the way the owner's Remove does (`src/app/admin/block-account.ts`).
Unblocking deletes the row; removed tiles stay removed. Votes already cast
stay, since votes are final.

### `code_attempts`
Wrong join-code guesses per network, so an 8-digit code can't be ground
through. Only the hash of the address is stored.

| Column | Type | Notes |
|---|---|---|
| `ip_hash` | `text` | PK with `window_start`; keyed hash |
| `window_start` | `timestamptz` | start of the 10-minute window |
| `attempts` | `integer` | wrong guesses in that window |

Rows for windows that have rolled off are deleted whenever a guess is counted,
so the table stays small without a scheduled job.

### `hall_of_fame`
A finished week's winner, kept forever. One row per week (plan v8 replaced the
original top seven with a single winner).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `venue_id` | `uuid` | FK → `venues` |
| `week_id` | `uuid` | FK → `weeks`, **unique** — one winner per week |
| `tile_id` | `uuid` | FK → `tiles`, unique, `on delete restrict` |
| `vote_count` | `int` | votes the winner had when it was crowned |

`on delete restrict` is what stops the 30-day purge from deleting a winning
tile. It's also why closing a board (ADR-009) goes through
`close_venue(venue_id)`: it deletes the board's Hall of Fame rows first, then
the owner row, which cascades to the venue and everything on it, in one
transaction; `service_role` only.

Rows are written by `finalize_week_winner(week_id)`, called the first time a
closed week's result is needed rather than by a job (ADR-003). It takes an
advisory lock on the week, so two people opening the Hall of Fame together
crown it once, and it is safe to call again — which is what makes removals
work: a week whose winning tile the owner has removed is **re-crowned from
what's left**, and a week with nothing else voted for loses its entry
entirely. Leaving a removed drawing enshrined would contradict the removal.

`finalize_venue_winners(venue_id)` does the same for every closed week of a
venue that has no entry yet, or whose winner is no longer live.

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
| `venues`, `weeks`, `hall_of_fame`, `profiles`, `monthly_finals`, `former_slugs` | anyone |
| `tiles` | anyone, `status = 'live'` only |
| `owners` | the owner, their own row |
| `daily_codes` | the owner, for their own venue |
| `devices`, `votes`, `final_votes`, `post_attempts`, `code_attempts`, `account_posts`, `tile_reports`, `venue_blocks` | nobody (service role only) |

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
| `anon`, `authenticated` | `venues`, `weeks`, `tiles`, `hall_of_fame`, `profiles`, `monthly_finals`, `former_slugs` | select |
| `authenticated` (owners) | `owners`, `daily_codes` | select |
| `anon`, `authenticated` | `devices`, `votes`, `final_votes`, `post_attempts`, `code_attempts`, `account_posts`, `tile_reports`, `venue_blocks` | none |

Functions follow the same rule. `record_blocked_attempt(venue_id, device_id,
local_day)` counts a moderation-blocked post and returns the day's new total in
one statement; execute is granted to `service_role` only, so `post_attempts`
stays closed to the API roles. `count_recent_posts_from_ip(ip_hash, since)`
counts recent posts from the devices last seen on one network, for burst
protection; same grant, since neither `devices` nor `tiles` can be joined this
way through the API. `ensure_daily_code(venue_id, valid_from, valid_until)`
returns the venue's code for that window, creating it on the first ask and
retrying past codes live elsewhere, and `record_code_attempt(ip_hash,
window_start)` counts a wrong guess; both are granted to `service_role` only.

The daily cleanup (issue #31) uses three more: `list_expired_weeks(before)`
returns weeks past retention that still hold something deletable — a week down
to its winner is left out, so the job converges instead of re-sweeping years of
history every night; `list_purgeable_tiles(week_id)` returns the tiles nothing
is keeping, excluding weekly winners and monthly super winners; and
`delete_unused_devices(before)` forgets devices that left no tiles or votes
behind. All three are `service_role` only.

**A new table must grant its privileges in the migration that creates it**,
or every query on it fails with `permission denied` (`42501`).
`supabase/schema.test.ts` checks this matrix and fails when a table is added
without updating it.
