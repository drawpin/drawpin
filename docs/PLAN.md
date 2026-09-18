# DrawPin — Product Plan (v7, locked)

> Source of truth for v1 scope. Changes require an ADR in `docs/adr/` and a version bump here.

## Concept
Free, web-based drawing boards for local spots (coffee shops, restaurants). Scan a printed QR or enter an 8-digit code, Kahoot-style. No app download, no user accounts. Draw a tile, see everyone's tiles, vote for the weekly winner, and crown a monthly super winner.

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
- If moderation can't be reached, the post is refused with "try again in a minute" and does **not** use up the daily post. It's never published unchecked, and posting works again as soon as moderation is back.
- No staff approval, no report button. The owner's "Remove tile" is the backstop — image moderation doesn't cover every category (e.g. drawn hate symbols), so it ships alongside moderation in phase 2.

### Weekly cycle
- Week runs **Monday 4:00 AM → next Monday 4:00 AM**, venue local time.
- Week N: posting open. Then the board locks.
- Week N+1: voting on week N's board is open all week. Opening the app shows a "Vote for last week's best" prompt.
- **Anyone with the link can vote** (drawing not required). 3 votes per device per week.
- Vote rules (defaults): each vote goes on a different tile, you can't vote on your own tile, and votes are final.
- Voting flow: pick up to 3 tiles, then cast them in one confirmation. Votes not cast yet stay available for the rest of the voting week.
- End of week N+1: the tile with the most votes is **week N's winner** and goes into the venue's Hall of Fame. Ties are broken by the earlier post. A tile needs **at least 1 vote** to win; a week with no votes has no winner.
- Live vote counts stay hidden until voting closes.
- Accepted risk: open voting can be stuffed by sharing the link. Mitigated by device limits + Turnstile on voting.
- Known limitation: votes are per device, so someone switching devices gets a fresh 3 votes, and someone who posted on one device can vote for their own tile from another.

### Monthly super winner
- A week belongs to the month its **Monday** falls in (venue local time).
- **Finalists:** that month's weekly winners, up to **4** — if there are more, the 4 with the most votes in their own weeks (ties to the earlier post).
- **Monthly final:** opens once every week of the month has finished voting (about 2 weeks into the next month) and runs one week, Monday 4:00 AM to Monday 4:00 AM. **1 vote per device**, same rules otherwise (not your own tile, final).
- The finalist with the most final votes is the month's **super winner** (ties to the earlier post). A month with a single finalist crowns it without a vote; a final with no votes, or a month with no weekly winners, has no super winner.
- Opening the app during a final shows a "Vote for this month's super winner" prompt.

### Device limiting (layered)
Signed device ID cookie + browser fingerprint (hashed) + IP rate limit (hashed) + Cloudflare Turnstile on post and vote.

### Owner admin (bare minimum)
- Owners are the only accounts: email magic link (Supabase Auth), single-use, short expiry, rate-limited, Turnstile on login.
- **One board per owner.**
- Setup: email → link → venue name + time zone → done.
- One screen: (1) QR + today's code (download/print), (2) Pause board toggle, (3) Remove a tile.
- Not included: analytics, branding, multiple staff logins, banning, settings.

### Data retention
- Weekly winners and monthly super winners (the Hall of Fame) are kept forever.
- All other tiles and images are deleted 30 days after that week's voting ends.
- Daily posting records are deleted after 30 days; devices unused for 90 days with no tiles or votes are deleted.
- Only hashes of IPs and fingerprints are stored.

### Free platform
No charges for venues or users in v1.

## Tech stack
- Next.js (App Router) on Vercel: customer pages, admin page, API route handlers, cron endpoints
- Supabase: Postgres, Storage (tile images, WebP), Realtime (new/removed tiles), Auth (owners)
- OpenAI moderation endpoint (text + image), custom blocklist
- Cloudflare Turnstile; FingerprintJS (open source)
- Canvas drawing: `perfect-freehand`
- Venue-time transitions happen on demand, when first needed (ADR-003): daily join code, week status, weekly winner, monthly final and super winner
- Scheduled jobs: Vercel Cron (daily) → 30-day cleanup

## Back pocket (not v1)
Weekly prompt mode, live jam mode, location checks, Google sign-in for owners, multi-location owners, wall display.

**Optional customer accounts** (issue #37) are the biggest of these and the one
most likely to change the shape of the product. v1 deliberately has no customer
accounts, and everything that asks "is this the same person?" — the device
cookie, the fingerprint, the hashed IP — is an approximation of what an account
would answer outright, on top of making reporting, bans and cross-device voting
straightforward. The likely shape is optional rather than required, so the "no
app, no account" front door stays open. Decide after v1 is in real venues.

## Phases
1. Owner signs in → creates board → customers open QR → username → draw tile → live feed on phones *(done)*
2. Safety, before sharing the board publicly: moderation pipeline, owner Pause board + Remove tile, Turnstile, device limits, rotating daily join code
3. Weekly cycle: lock, vote prompt, voting rules, weekly winner, monthly final and super winner, Hall of Fame, cleanup job
4. UI pass: visual polish across customer and owner pages (issue #40, with #38 and #39)
5. Back-pocket features, starting with optional customer accounts (#37)

v6 changes: scheduling moved from an hourly cron to on-demand transitions plus a daily cleanup job (ADR-003, Vercel Hobby only allows daily cron); owner Pause/Remove moved from phase 4 into phase 2 as the moderation backstop; moderation-outage behavior defined; phase 4 is now the UI pass.

v7 changes: the weekly Hall of Fame is a single winner (at least 1 vote) instead of a top 7; added the monthly final among up to 4 weekly winners and the monthly super winner; defined the voting flow and hidden live counts; noted the per-device voting limitation; added retention for posting records and unused devices.

## Diagrams (Lucid)
- System architecture
- Post & weekly-cycle flows
- Database ERD

### Diagram links
- System Architecture: https://lucid.app/lucidchart/629ff9fe-e215-4bbb-b5d9-120f87a55a8e/edit
- Post, Vote & Weekly Cycle Flows: https://lucid.app/lucidchart/d0cb474a-8eba-4d8d-8fce-4ad46bc47bb6/edit
- Database ERD: https://lucid.app/lucidchart/1e2f0c20-87e8-4065-9f7e-11c4fc2a4124/edit
