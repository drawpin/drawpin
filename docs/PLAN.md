# DrawPin — Product Plan (v5, locked)

> Source of truth for v1 scope. Changes require an ADR in `docs/adr/` and a version bump here.

## Concept
Free, web-based drawing boards for local spots (coffee shops, restaurants). Scan a printed QR or enter an 8-digit code, Kahoot-style. No app download, no user accounts. Draw a tile, see everyone's tiles, vote on the weekly top 7.

## Scope v1
### Joining
- Static printed QR opens the venue's board directly (Option B).
- 8-digit code rotates daily at **4:00 AM venue local time**, for people typing it in.
- No wall TV/tablet. The board is viewed on phones.
- Location checks (IP/geofence) are out of scope for v1.

### Tiles (default mode)
- Each tile = freehand drawing (a few colors + brush sizes) + optional typed caption (max 80 chars).
- Posting as anonymous or with a username. Usernames aren't unique; they show a tag, e.g. `Ahmad#4821`.
- **1 post per device per day** (day resets 4:00 AM venue time).

### Moderation (automatic only)
- Every username, caption, and drawing is checked by a blocklist + OpenAI moderation (text + image).
- A blocked post shows "This couldn't be posted" and does **not** use up the daily post.
- **3 blocked attempts in a day locks the device until the next 4:00 AM reset.**
- No staff approval, no report button. The owner's "Remove tile" is the backstop.

### Weekly cycle
- Week runs **Monday 4:00 AM → next Monday 4:00 AM**, venue local time.
- Week N: posting open. Then the board locks.
- Week N+1: voting on week N's board is open all week. Opening the app shows a "Vote for last week's best" prompt.
- **Anyone with the link can vote** (drawing not required). 3 votes per device per week.
- Vote rules (defaults): each vote goes on a different tile, you can't vote on your own tile, and votes are final.
- End of week N+1: the **top 7** go into the venue's Hall of Fame. Ties are broken by the earlier post.
- Accepted risk: open voting can be stuffed by sharing the link. Mitigated by device limits + Turnstile on voting.

### Device limiting (layered)
Signed device ID cookie + browser fingerprint (hashed) + IP rate limit (hashed) + Cloudflare Turnstile on post and vote.

### Owner admin (bare minimum)
- Owners are the only accounts: email magic link (Supabase Auth), single-use, short expiry, rate-limited, Turnstile on login.
- **One board per owner.**
- Setup: email → link → venue name + time zone → done.
- One screen: (1) QR + today's code (download/print), (2) Pause board toggle, (3) Remove a tile.
- Not included: analytics, branding, multiple staff logins, banning, settings.

### Data retention
- Hall of Fame (top 7) is kept forever.
- All other tiles and images are deleted 30 days after that week's voting ends.
- Only hashes of IPs and fingerprints are stored.

### Free platform
No charges for venues or users in v1.

## Tech stack
- Next.js (App Router) on Vercel: customer pages, admin page, API route handlers, cron endpoints
- Supabase: Postgres, Storage (tile images, WebP), Realtime (new/removed tiles), Auth (owners)
- OpenAI moderation endpoint (text + image), custom blocklist
- Cloudflare Turnstile; FingerprintJS (open source)
- Canvas drawing: `perfect-freehand`
- Scheduled jobs: Vercel Cron (hourly) → per-venue code rotation, week rollover, Hall of Fame finalize, 30-day cleanup

## Back pocket (not v1)
Weekly prompt mode, live jam mode, location checks, Google sign-in for owners, multi-location owners, wall display.

## Phases
1. Owner signs in → creates board → customers open QR/code → username → draw tile → live feed on phones
2. Moderation pipeline, rotating code, device limits, Turnstile
3. Weekly cycle: lock, vote prompt, voting rules, Hall of Fame, cleanup job
4. Owner admin screen (QR/code, pause, remove tile)
5. Back-pocket features

## Diagrams (Lucid)
- System architecture
- Post & weekly-cycle flows
- Database ERD

### Diagram links
- System Architecture: https://lucid.app/lucidchart/629ff9fe-e215-4bbb-b5d9-120f87a55a8e/edit
- Post, Vote & Weekly Cycle Flows: https://lucid.app/lucidchart/d0cb474a-8eba-4d8d-8fce-4ad46bc47bb6/edit
- Database ERD: https://lucid.app/lucidchart/1e2f0c20-87e8-4065-9f7e-11c4fc2a4124/edit
