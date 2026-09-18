# DrawPin — Product Plan (v8, locked)

> Source of truth for v1 scope. Changes require an ADR in `docs/adr/` and a version bump here.

## Concept
Free, web-based drawing boards for local spots (coffee shops, restaurants). Scan a printed QR or enter an 8-digit code, Kahoot-style. No app download, and no account needed to draw. Signing in with Google is what puts a drawing in the running: draw a tile, see everyone's tiles, vote for the weekly winner, and crown a monthly super winner.

## Scope v1
### Joining
- Static printed QR opens the venue's board directly (Option B).
- 8-digit code rotates daily at **4:00 AM venue local time**, for people typing it in.
- No wall TV/tablet. The board is viewed on phones.
- Location checks (IP/geofence) are out of scope for v1.

### Accounts (ADR-004)
Drawing needs no account. **Competing does.**

| | Anonymous | Signed in |
|---|---|---|
| See the board | yes | yes |
| Draw a tile | yes, shown as a guest | yes, under their username |
| Be voted for, and win | no | yes |
| Vote | no | yes, from any device |
| Report a tile | no | yes |

- **Google sign-in only** for customers (Supabase Auth). Owners keep their email magic link.
- A customer picks a username on first sign-in; usernames aren't unique, so a tile shows the same 4-digit tag as before, e.g. `Ahmad#4821`, derived from the account instead of the device.
- Deleting an account deletes that person's tiles and votes. Hall of Fame entries stay, shown without a name.

### Tiles (default mode)
- Each tile = freehand drawing (a few colors + brush sizes) + optional typed caption (max 80 chars).
- Posting as a guest or signed in. A guest tile shows the optional name typed with it and is marked as not in the running; a signed-in tile shows that account's username.
- **1 post per device per day** (day resets 4:00 AM venue time). A signed-in post must also pass **1 post per account per day**, so a second device doesn't buy a second post.

### Moderation (automatic only)
- Every username, caption, and drawing is checked by a blocklist + OpenAI moderation (text + image).
- A blocked post shows "This couldn't be posted" and does **not** use up the daily post.
- **3 blocked attempts in a day locks the device until the next 4:00 AM reset.**
- If moderation can't be reached, the post is refused with "try again in a minute" and does **not** use up the daily post. It's never published unchecked, and posting works again as soon as moderation is back.
- No staff approval. Signed-in customers can **report a tile**, which flags it for the owner; reporting needs an account so a report is attributable and not endlessly repeatable.
- The owner's "Remove tile" is the backstop — image moderation doesn't cover every category (e.g. drawn hate symbols), so it ships alongside moderation in phase 2.

### Weekly cycle
- Week runs **Monday 4:00 AM → next Monday 4:00 AM**, venue local time.
- Week N: posting open. Then the board locks.
- Week N+1: voting on week N's board is open all week. Opening the app shows a "Vote for last week's best" prompt.
- **Anyone signed in can vote** (drawing not required). 3 votes per account per week, from any device.
- Vote rules (defaults): each vote goes on a different tile, you can't vote on your own tile, and votes are final.
- Voting flow: pick up to 3 tiles, then cast them in one confirmation. Votes not cast yet stay available for the rest of the voting week.
- Guest tiles appear on the voting screen but can't be selected: only tiles posted by an account are votable and eligible to win.
- End of week N+1: the tile with the most votes is **week N's winner** and goes into the venue's Hall of Fame. Ties are broken by the earlier post. A tile needs **at least 1 vote** to win; a week with no votes has no winner.
- Live vote counts stay hidden until voting closes.
- Accepted risk: someone determined can make a second Google account. Out of scope to chase at this scale; Turnstile still applies to voting.

### Monthly super winner
- A week belongs to the month its **Monday** falls in (venue local time).
- **Finalists:** that month's weekly winners, up to **4** — if there are more, the 4 with the most votes in their own weeks (ties to the earlier post).
- **Monthly final:** opens once every week of the month has finished voting (about 2 weeks into the next month) and runs one week, Monday 4:00 AM to Monday 4:00 AM. **1 vote per account**, same rules otherwise (not your own tile, final).
- The finalist with the most final votes is the month's **super winner** (ties to the earlier post). A month with a single finalist crowns it without a vote; a final with no votes, or a month with no weekly winners, has no super winner.
- Opening the app during a final shows a "Vote for this month's super winner" prompt.

### Abuse limiting (layered)
Account (where there is one) + signed device ID cookie + browser fingerprint (hashed) + IP rate limit (hashed) + Cloudflare Turnstile on post and vote. The device layers carry guest posting on their own, and add to the account limit for signed-in posting.

### Owner admin (bare minimum)
- Owners sign in by email magic link (Supabase Auth), single-use, short expiry, rate-limited, Turnstile on login. Customers sign in with Google; the two are separate roles on one auth system.
- **One board per owner.**
- Setup: email → link → venue name + time zone → done.
- One screen: (1) QR + today's code (download/print), (2) Pause board toggle, (3) Remove a tile, (4) reported tiles, surfaced first.
- Not included: analytics, branding, multiple staff logins, settings. Blocking an account from a board is the natural next step once reporting is real, but it isn't in v1.

### Data retention
- Weekly winners and monthly super winners (the Hall of Fame) are kept forever.
- All other tiles and images, guest tiles included, are deleted 30 days after that week's voting ends.
- Daily posting records are deleted after 30 days; devices unused for 90 days with no tiles or votes are deleted.
- Only hashes of IPs and fingerprints are stored.

### Free platform
No charges for venues or users in v1.

## Tech stack
- Next.js (App Router) on Vercel: customer pages, admin page, API route handlers, cron endpoints
- Supabase: Postgres, Storage (tile images, WebP), Realtime (new/removed tiles), Auth (owners by magic link, customers by Google)
- OpenAI moderation endpoint (text + image), custom blocklist
- Cloudflare Turnstile; FingerprintJS (open source)
- Canvas drawing: `perfect-freehand`
- Venue-time transitions happen on demand, when first needed (ADR-003): daily join code, week status, weekly winner, monthly final and super winner
- Scheduled jobs: Vercel Cron (daily) → 30-day cleanup

## Back pocket (not v1)
Weekly prompt mode ("challenges"), live jam mode, location checks, Google
sign-in for owners, multi-location owners, wall display.

Accounts open a few more: a customer's saved drawings and history (#44),
blocking an account from a board, and more ways to sign in — Facebook, Apple,
email codes, passkeys (#50). Google is the only provider in v1; anyone without
one can still draw as a guest. None of these are v1.

## Phases
1. Owner signs in → creates board → customers open QR → username → draw tile → live feed on phones *(done)*
2. Safety, before sharing the board publicly: moderation pipeline, owner Pause board + Remove tile, Turnstile, device limits, rotating daily join code
3. Accounts and the weekly cycle: Google sign-in and profiles, then week status from timestamps, voting, weekly winner, Hall of Fame, monthly final and super winner, reporting, cleanup job
4. UI pass: visual polish across customer and owner pages (issue #40, with #38 and #39)
5. Back-pocket features, starting with optional customer accounts (#37)

v6 changes: scheduling moved from an hourly cron to on-demand transitions plus a daily cleanup job (ADR-003, Vercel Hobby only allows daily cron); owner Pause/Remove moved from phase 4 into phase 2 as the moderation backstop; moderation-outage behavior defined; phase 4 is now the UI pass.

v7 changes: the weekly Hall of Fame is a single winner (at least 1 vote) instead of a top 7; added the monthly final among up to 4 weekly winners and the monthly super winner; defined the voting flow and hidden live counts; noted the per-device voting limitation; added retention for posting records and unused devices.

v8 changes: customer accounts added (ADR-004) — Google sign-in for customers, anonymous drawing stays but guest tiles can't be voted for or win, votes and the monthly final move from per device to per account, a signed-in post must pass both the account and the device daily limit, reporting a tile becomes possible and joins the owner screen, and accounts move from the back pocket into phase 3 so voting and winners are built on them once instead of twice.

## Diagrams (Lucid)
- System architecture
- Post & weekly-cycle flows
- Database ERD

### Diagram links
- System Architecture: https://lucid.app/lucidchart/629ff9fe-e215-4bbb-b5d9-120f87a55a8e/edit
- Post, Vote & Weekly Cycle Flows: https://lucid.app/lucidchart/d0cb474a-8eba-4d8d-8fce-4ad46bc47bb6/edit
- Database ERD: https://lucid.app/lucidchart/1e2f0c20-87e8-4065-9f7e-11c4fc2a4124/edit
