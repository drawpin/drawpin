# DrawPin — Product Plan (v8, locked)

> Source of truth for v1 scope. Changes require an ADR in `docs/adr/` and a version bump here.

## Concept
Free, web-based shared drawing boards for any group of people — a restaurant, a classroom, a party, a group chat. Whoever sets a board up decides what it's for. Scan a printed QR or enter an 8-digit code, Kahoot-style. No app download, and no account needed to draw. Signing in with Google is what puts a drawing in the running: draw a tile, see everyone's tiles, vote for the weekly winner, and crown a monthly super winner.

A place with tables is one kind of group and the one the product was designed around — printed codes, a daily rotation, an owner who prints one thing and walks away — so the model keeps that shape: a board has an owner, a time zone and a code. The outward copy does not assume a business.

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
- Each tile = a drawing + optional typed caption (max 80 chars).
- Drawing tools: pen, marker, spray, eraser, paint bucket, and shapes (line, circle, square — the line doubles as a ruler; circles and squares come out perfect, and Shift stretches them on a keyboard). Six base colours plus a colour wheel and hex field. A Snap toggle (hold still at the end of a stroke to straighten it into a line or shape) and a lasso (circle part of the drawing to move or resize it) were added with the shapes, all from the first test round's feedback.
- Posting as a guest or signed in. A guest tile shows the optional name typed with it and is marked as not in the running; a signed-in tile shows that account's username.
- **1 post per device per day** (day resets 4:00 AM venue time). A signed-in post must also pass **1 post per account per day**, so a second device doesn't buy a second post.

### Moderation (automatic only)
- Every username, caption, and drawing is checked by a blocklist + OpenAI moderation (text + image). Every drawing is also read by a vision model (`gpt-4.1-mini`) for written words, hate symbols and sexual content, and the words it reads go through the blocklist too (ADR-006).
- Family-friendly policy: slurs, hate symbols, and genitals or sexual acts are blocked. Religious and national symbols, and nudity without genitals, are allowed. Anything borderline is blocked.
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
- One screen: (1) QR + today's code (download/print), (2) Pause board toggle, (3) Remove a tile, (4) reported tiles, surfaced first, (5) rename the board.
- Renaming changes the display name only. The slug is generated once at setup, the QR encodes `/b/<slug>`, and the daily code is keyed by venue and time window — so a rename reprints nothing. Changing the slug is not in v1: it would kill every printed code, and needs a table of former slugs to redirect from.
- Not included: analytics, branding, multiple staff logins, any other settings. Blocking an account from a board is the natural next step once reporting is real, but it isn't in v1.

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

**Per-board moderation strictness.** Today moderation is one fixed set of
rules for every board: the built-in profanity list
(`src/lib/moderation/profanity-terms.ts`) blocks every category the source
list carries, not just slurs, and the drawing nudity check allows its
"Sexy" class through (ADR-005). Letting each owner tune their own board's
strictness — e.g. slurs only vs. all profanity, or how the nudity check
treats "Sexy" — is a reasonable ask once there's real feedback across more
than one board. Not v1.

Accounts open a few more: a customer's saved drawings and history (#44),
blocking an account from a board, and more ways to sign in — Facebook, Apple,
email codes, passkeys (#50). Google is the only provider in v1; anyone without
one can still draw as a guest. None of these are v1.

**Downloading your own drawings** (#57) is the one worth pulling forward
soonest: everything but a winner is deleted 30 days after voting, image and
all, so today a screenshot is the only way anyone keeps what they drew.
Downloading would need an account — a guest sees the option and is asked to
sign in when they tap it, since that is the moment an account is worth
something to them. The catch to solve first is that signing in does not make a
guest tile theirs, so the account has to adopt what the device posted. Not v1
as it stands.

## Phases
1. Owner signs in → creates board → customers open QR → username → draw tile → live feed on phones *(done)*
2. Safety, before sharing the board publicly: moderation pipeline, owner Pause board + Remove tile, Turnstile, device limits, rotating daily join code
3. Accounts and the weekly cycle: Google sign-in and profiles, then week status from timestamps, voting, weekly winner, Hall of Fame, monthly final and super winner, reporting, cleanup job
4. **Fully functional first** (issue #67), then the UI pass (#40, with #39) — including showing a real board on the home page rather than describing one
5. Back-pocket features, starting with downloading your own drawings (#57)

### Fully functional before the UI pass
The product is feature-complete and not yet usable by anyone but us. These come
before any styling, so the UI pass has a finished product to dress rather than a
moving target. Tracked in issue #67:

- **It runs by itself**: the cleanup job has its secret (#60), and a quiet
  Supabase project doesn't pause and take the boards with it (#62).
- **We stop testing against live data**: preview deployments point at their own
  database, not production (#61).
- **Customers can sign in**: a domain and custom SMTP (#41), and the Google app
  published (#63) — until then only listed test users can vote, win or report.
- **We find out when it breaks**: every failure path is deliberately quiet, so
  an outage looks like a slow evening (#64).
- **It is proven in production**: the whole cycle run on a real phone (#65),
  including the devices a QR scan actually lands on (#66).

v6 changes: scheduling moved from an hourly cron to on-demand transitions plus a daily cleanup job (ADR-003, Vercel Hobby only allows daily cron); owner Pause/Remove moved from phase 4 into phase 2 as the moderation backstop; moderation-outage behavior defined; phase 4 is now the UI pass.

v7 changes: the weekly Hall of Fame is a single winner (at least 1 vote) instead of a top 7; added the monthly final among up to 4 weekly winners and the monthly super winner; defined the voting flow and hidden live counts; noted the per-device voting limitation; added retention for posting records and unused devices.

v8 changes: customer accounts added (ADR-004) — Google sign-in for customers, anonymous drawing stays but guest tiles can't be voted for or win, votes and the monthly final move from per device to per account, a signed-in post must pass both the account and the device daily limit, reporting a tile becomes possible and joins the owner screen, and accounts move from the back pocket into phase 3 so voting and winners are built on them once instead of twice.

## Diagrams

Kept privately in Lucidchart, not linked here:

- System architecture
- Post, vote & weekly-cycle flows
- Database ERD
