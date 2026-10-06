# DrawPin — Product Plan (v17, locked)

> Source of truth for v1 scope. Changes require an ADR in `docs/adr/` and a version bump here.

## Concept
Free, web-based shared drawing boards for any group of people — a restaurant, a classroom, a party, a group chat. Whoever sets a board up decides what it's for. Scan a printed QR or enter an 8-digit code, Kahoot-style. No app download, and no account needed to draw for fun. Signing in with Google is what puts a drawing on the board: draw a tile, see everyone's tiles, vote for the weekly winner, and crown a monthly super winner.

A place with tables is one kind of group and the one the product was designed around — printed codes, a daily rotation, an owner who prints one thing and walks away — so the model keeps that shape: a board has an owner, a time zone and a code. The outward copy does not assume a business.

## Scope v1
### Joining
- Static printed QR opens the venue's board directly (Option B).
- 8-digit code rotates daily at **4:00 AM venue local time**, for people typing it in.
- No wall TV/tablet. The board is viewed on phones.
- Location checks (IP/geofence) are out of scope for v1.

### Accounts (ADR-004, ADR-007)
Drawing for fun needs no account. **Posting and competing do.**

| | Anonymous | Signed in |
|---|---|---|
| See the board | yes | yes |
| Draw | yes, for fun: it isn't posted | yes |
| Post a tile to the board | no | yes, under their username |
| Be voted for, and win | no | yes |
| Vote | no | yes, from any device |
| Report a tile | no | yes |

- Customers sign in **with Google, or with a code emailed to any address** (Supabase Auth, ADR-010). Owners sign in by email too, with a code or a link (see Owner admin).
- A customer picks a username on first sign-in; usernames aren't unique, so a tile shows the same 4-digit tag as before, e.g. `Ahmad#4821`, derived from the account instead of the device.
- Deleting an account deletes that person's tiles and votes. Hall of Fame entries stay, shown without a name.
- A signed-in customer can save their own drawings that are still on a board as PNGs, from their account page (#57), before the 30-day clean-up removes them.

### Tiles (default mode)
- Each tile = a drawing + optional typed caption (max 80 chars).
- Drawing tools: pen, marker, spray, eraser, paint bucket, and shapes (line, circle, square — the line doubles as a ruler; circles and squares come out perfect, and Shift stretches them on a keyboard). Six base colours plus a colour wheel and hex field. A Snap toggle (hold still at the end of a stroke to straighten it into a line or shape) and a lasso (circle part of the drawing to move or resize it) were added with the shapes, all from the first test round's feedback. The pen draws an even line on every device by default; a Pressure switch makes its width follow a stylus's pressure, or the speed of a finger or mouse.
- Posting needs a sign-in (ADR-007), with Google or an emailed code (ADR-010). A tile shows that account's username. A guest can draw as much as they like, but nothing they draw goes on the board.
- **1 post per account per day and 1 per device per day** (day resets 4:00 AM venue time), so a second device doesn't buy a second post.
- A board shows how many artists and drawings it has had, all time. The counts are kept as tiles are posted, so they don't drop when the 30-day clean-up deletes old tiles.

### Moderation (automatic only)
- At All Ages, every username, caption, and drawing is checked by a blocklist + OpenAI moderation (text + image). Every drawing is also read by a vision model (`gpt-4.1-mini`) for written words, hate symbols and sexual content, and the words it reads go through the blocklist too (ADR-006).
- Each board has a **moderation level** (ADR-012), picked at setup and changeable by the owner. A change applies to new posts only.
  - **All Ages** (default): best for family spots and businesses. Full moderation, blocking anything suggestive, crude or violent: swearing, violence, slurs, hate symbols, genitals or sexual acts, and contact details. Religious and national symbols, and nudity without genitals, are allowed. Anything borderline is blocked.
  - **Standard**: allows swearing, violence and gore. Sexual content, slurs, hate symbols and contact details are still blocked.
  - **Late Night**: no moderation, and no vision model call.
  - On every level, sexual content involving minors is blocked (a legal floor, not a setting), and Report and Remove tile still work. Politics isn't checked on any level.
- The level covers drawings and captions posted on that board. Usernames and board names are always checked at All Ages.
- Visitors see a "Board rules" link in the board footer saying what the level allows. Standard and Late Night also say so in the draw screen's small print, and Late Night shows a one-time "this board isn't moderated" warning before the board, remembered per device.
- A blocked post says what kind of problem it was (hateful, sexual, violent, contact details or language) and how many tries are left, but never the word that matched. It does **not** use up the daily post.
- **3 blocked attempts in a day locks the device until the next 4:00 AM reset.**
- If moderation can't be reached, the post is refused with "try again in a minute" and does **not** use up the daily post. It's never published unchecked, and posting works again as soon as moderation is back.
- No staff approval. Signed-in customers can **report a tile**, which flags it for the owner; reporting needs an account so a report is attributable and not endlessly repeatable.
- The owner's "Remove tile" is the backstop — image moderation doesn't cover every category (e.g. drawn hate symbols, or crude schematic nudity that reads as obviously offensive to a person but not to a classifier trained on photos/art — confirmed empirically, ADR-005), so it ships alongside moderation in phase 2.

### Weekly cycle
- Week runs **Monday 4:00 AM → next Monday 4:00 AM**, venue local time.
- Week N: posting open. Then the board locks.
- Week N+1: voting on week N's board is open all week. Opening the app shows a "Vote for last week's best" prompt.
- **Anyone signed in can vote** (drawing not required). 3 votes per account per week, from any device.
- Vote rules (defaults): each vote goes on a different tile, you can't vote on your own tile, and votes are final.
- Voting flow: pick up to 3 tiles, then cast them in one confirmation. Votes not cast yet stay available for the rest of the voting week.
- Guest tiles posted before v9 appear on the voting screen but can't be selected: only tiles posted by an account are votable and eligible to win.
- End of week N+1: the tile with the most votes is **week N's winner** and goes into the venue's Hall of Fame. Ties are broken by the earlier post. A tile needs **at least 1 vote** to win; a week with no votes has no winner.
- The vote page shows the **top 3 so far, with their vote counts**, all week, as a podium (ADR-011). Its order is the winner rule's, so the tile on top when voting closes wins. Who voted for what stays private. Accepted risk: an early leader can snowball on a small board.
- When voting closes, for a week, the board reveals the result: the top three rise onto a podium, third to first, with their vote counts, and the winner is crowned. It plays once per device and can be replayed. The Hall of Fame still keeps the winner alone.
- Accepted risk: someone determined can make a second Google account. Out of scope to chase at this scale; Turnstile still applies to voting.

### Monthly super winner
- A week belongs to the month its **Monday** falls in (venue local time).
- **Finalists:** that month's weekly winners, up to **4** — if there are more, the 4 with the most votes in their own weeks (ties to the earlier post).
- **Monthly final:** opens once every week of the month has finished voting (about 2 weeks into the next month) and runs one week, Monday 4:00 AM to Monday 4:00 AM. **1 vote per account**, same rules otherwise (not your own tile, final), except that its vote counts stay hidden until it closes (ADR-011).
- The finalist with the most final votes is the month's **super winner** (ties to the earlier post). A month with a single finalist crowns it without a vote; a final with no votes, or a month with no weekly winners, has no super winner.
- Opening the app during a final shows a "Vote for this month's super winner" prompt. When a final closes, the board reveals its finalists and crowns the super winner the same way as a week's result.

### Abuse limiting (layered)
Account + signed device ID cookie + browser fingerprint (hashed) + IP rate limit (hashed) + Cloudflare Turnstile on post and vote. The device layers add to the account limit.

### Owner admin (bare minimum)
- Owners sign in by email (Supabase Auth): one email carries a code to type and a link to tap, both single-use with a short expiry, rate-limited, Turnstile on login. Customers sign in with Google or an emailed code. One account can both draw and own a board (ADR-013): Start a board and Manage my board take a signed-in account straight to its board or to setup.
- **One board per owner.**
- Setup: email → code or link → board name + time zone + moderation level → done.
- One screen: (1) QR + today's code (download, or print a table tent or poster in one of five looks), (2) Pause board toggle, (3) Remove a tile, (4) reported tiles, surfaced first, (5) rename the board, (6) change the board link, (7) change the time zone, (8) block an account (ADR-008), (9) close the board (ADR-009), (10) board rules: the moderation level (ADR-012).
- Renaming changes the display name only. The slug is generated once at setup, the QR encodes `/b/<slug>`, and the daily code is keyed by venue and time window — so a rename reprints nothing.
- Changing the link builds a new slug from the current name, offered once a rename has left the old one behind. Every former slug redirects to the board for good and is never given to another board, so printed codes keep working.
- Changing the time zone takes effect from the next week; the current week keeps its boundaries.
- Blocking an account stops it posting, voting and reporting on that board, and removes its live tiles there. The owner can unblock.
- Closing the board deletes everything on it, the Hall of Fame included, and the owner's sign-in. The owner types the board's name to confirm. Its links aren't reserved afterwards.
- Not included: analytics, branding, multiple staff logins, any other settings.

### Data retention
- Weekly winners and monthly super winners (the Hall of Fame) are kept forever, unless the owner closes the board.
- All other tiles and images are deleted 30 days after that week's voting ends.
- Daily posting records are deleted after 30 days; devices unused for 90 days with no tiles or votes are deleted.
- Only hashes of IPs and fingerprints are stored.

### Free platform
No charges for venues or users in v1.

## Tech stack
- Next.js (App Router) on Vercel: customer pages, admin page, API route handlers, cron endpoints
- Supabase: Postgres, Storage (tile images, WebP), Realtime (new/removed tiles), Auth (owners by emailed code or link, customers by Google or emailed code)
- OpenAI moderation endpoint (text + image), a vision model reading every drawing below Late Night (ADR-006, ADR-012), a drawing-aware nudity check (NSFWJS, ADR-005), custom blocklist
- Email through custom SMTP (Resend), from `hello@drawpin.io`: sign-in emails and health alerts
- Cloudflare Turnstile; FingerprintJS (open source)
- Canvas drawing: `perfect-freehand`
- Venue-time transitions happen on demand, when first needed (ADR-003): daily join code, week status, weekly winner, monthly final and super winner
- Scheduled jobs: Vercel Cron (daily) → 30-day cleanup, and a daily health check of the database, storage, the OpenAI key and the Turnstile secret, which emails when one fails

## Back pocket (not v1)
Weekly prompt mode ("challenges"), live jam mode, location checks, Google
sign-in for owners, multi-location owners, wall display.

Accounts open a few more: a customer's saved drawings and history (#44),
and more ways to sign in — Facebook, Apple, passkeys (#50). Google and
emailed codes (ADR-010) are the ways in for v1; anyone who'd rather not can
still draw as a guest. None of these are v1.

## Phases
1. Owner signs in → creates board → customers open QR → username → draw tile → live feed on phones *(done)*
2. Safety, before sharing the board publicly: moderation pipeline, owner Pause board + Remove tile, Turnstile, device limits, rotating daily join code
3. Accounts and the weekly cycle: Google sign-in and profiles, then week status from timestamps, voting, weekly winner, Hall of Fame, monthly final and super winner, reporting, cleanup job
4. **Fully functional first** (issue #67), then the UI pass (#40, with #39) — including showing a real board on the home page rather than describing one
5. Back-pocket features. Downloading your own drawings (#57) came first and is in v1 as of v14.

### Fully functional before the UI pass
The product is feature-complete and not yet usable by anyone but us. These come
before any styling, so the UI pass has a finished product to dress rather than a
moving target. Tracked in issue #67:

- **It runs by itself** *(done)*: the cleanup job has its secret (#60), and a
  quiet Supabase project doesn't pause and take the boards with it (#62).
- **We stop testing against live data** *(done)*: preview deployments point at
  their own database, `drawpin-preview`, not production (#61).
- **Customers can sign in** *(done)*: drawpin.io with custom SMTP (#41), and
  the Google app published (#63).
- **We find out when it breaks** *(partly)*: every failure path is deliberately
  quiet, so an outage looks like a slow evening (#64). The daily health check
  now emails when a dependency stops answering; error tracking and an uptime
  monitor are still to do.
- **It is proven in production** *(done)*: the whole cycle run on a real phone (#65),
  including the devices a QR scan actually lands on (#66).

v6 changes: scheduling moved from an hourly cron to on-demand transitions plus a daily cleanup job (ADR-003, Vercel Hobby only allows daily cron); owner Pause/Remove moved from phase 4 into phase 2 as the moderation backstop; moderation-outage behavior defined; phase 4 is now the UI pass.

v7 changes: the weekly Hall of Fame is a single winner (at least 1 vote) instead of a top 7; added the monthly final among up to 4 weekly winners and the monthly super winner; defined the voting flow and hidden live counts; noted the per-device voting limitation; added retention for posting records and unused devices.

v8 changes: customer accounts added (ADR-004) — Google sign-in for customers, anonymous drawing stays but guest tiles can't be voted for or win, votes and the monthly final move from per device to per account, a signed-in post must pass both the account and the device daily limit, reporting a tile becomes possible and joins the owner screen, and accounts move from the back pocket into phase 3 so voting and winners are built on them once instead of twice.

v9 changes: guests draw for fun only (ADR-007). Posting needs a Google sign-in, so every tile belongs to an account; guest tiles posted before v9 stay until the normal 30-day clean-up.

v10 changes: the owner screen gains three settings (ADR-008): change the board link, with every former link redirecting; change the time zone from the next week; and block an account from the board, which also removes its tiles there.

v11 changes: an owner can close their board (ADR-009), deleting everything on it, the Hall of Fame included, and their sign-in.

v12 changes: when voting closes, the board reveals the top three with their vote counts, and a closed final reveals its super winner; counts are still hidden while voting is open.

v13 changes: customers can sign in with a code emailed to any address as well as with Google (ADR-010).

v14 changes: records what shipped alongside v12 and v13. Downloading your own drawings (#57) moves from the back pocket into v1; a board's artist and drawing counts are all-time; the owner's QR can be printed as a table tent or poster; owners can type the code from their sign-in email as well as tap its link.

v15 changes: weekly vote counts are public while voting is open, as a top-3 podium on the vote page (ADR-011), and the reveal when voting closes stays; the monthly final keeps its counts hidden until it closes.

v16 changes: moderation is no longer one fixed policy. Each board picks a level, All Ages (today's rules, the default), Standard or Late Night (ADR-012), at setup and from a tenth owner setting; sexual content involving minors is blocked on every level, and usernames and board names stay at All Ages. Per-board moderation strictness leaves the back pocket.

v17 changes: one account can both draw and own a board (ADR-013); closing a board keeps the sign-in of an owner who also draws, and a drawing account that owns a board is closed from the owner screen before it can be deleted.

## Diagrams

Kept privately in Lucidchart, not linked here:

- System architecture
- Post, vote & weekly-cycle flows
- Database ERD
