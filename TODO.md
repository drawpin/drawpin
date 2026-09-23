# DrawPin — to-do

Everything we've decided to do and haven't done yet, in the order it matters.

GitHub issues stay the source of truth for anything with a number; this file is
the map, and the place for things that don't have an issue yet. `docs/PLAN.md`
is still the locked v1 scope — nothing here changes it.

Last updated: 2026-09-22.

---

## 1. Finish the launch blockers

Tracked in **#67**. The product is feature-complete and still not usable by
anyone but us.

Nothing here waits on you alone any more. What is left is mine to build, but
each of the three needs you to open an account or pick up a phone first.

### Mine, once the door is open

- [ ] **#64 — nothing tells us when DrawPin breaks.** Every failure path is
      deliberately quiet, so an outage looks like a slow evening. _Needs you to
      create the Sentry project and the uptime monitor_; wiring them in and
      reporting the cron's result are mine.
- [ ] **#65 — run the whole cycle in production, on a real phone.** #63 is
      proven, so this can start now — and it should, because it takes days of
      wall-clock time: a week rolls over, voting opens, a winner is crowned.
      _Needs your phone, and a second Google account to vote with._
- [ ] **#66 — real devices.** iOS private browsing, and the in-app browsers a
      QR scan lands in, where Google sign-in is sometimes blocked outright.
      _Needs real devices in real hands._

### Done in this stretch, kept for the record

- **#41** — domain and custom SMTP. drawpin.io is live, mail sends as
  `hello@drawpin.io` through Resend, sign-in links work on any device.
- `SITE_URL` is `https://drawpin.io`, confirmed from the Board link on the
  owner screen: a real board and its draw and Hall of Fame pages all answer on
  the domain, so a scanned QR lands somewhere that works.
- Mail is fully signed: SPF and DKIM from the Resend setup, and `_dmarc`
  (`v=DMARC1; p=none;`) resolving publicly.
- **#63** — the Google app is **in production**, so the test-user list no
  longer gates anything. The 100-user OAuth cap on that page applies only to
  unapproved sensitive or restricted scopes; `email` and `profile` are
  neither. It would bind the day we ask for more, which would also mean a
  verification review.
- Both cron jobs run and return 200: `/api/cron/cleanup` at 09:00 UTC and
  `/api/cron/health` at 13:00 UTC, with the feature enabled and Hobby's
  one-hour window.
- **#61** — previews read `drawpin-preview`, a second free Supabase project
  with the same schema. Proven from both sides at once: a preview returns
  **Board not found** for the production board slug, while production serves
  it. Turnstile runs on Cloudflare's test keys in previews, because every
  preview gets a hostname the widget's allow-list has never seen.
- **#60** — the cleanup job's secret. **#62** — closed deliberately.
- Turnstile's hostname allow-list had only the vercel.app domain, so on
  drawpin.io nobody could sign in, post, vote or report. Fixed in Cloudflare.
  **Any future hostname needs adding there too.**

---

## 2. The UI and copy pass (#40)

Four rounds are merged (#83, #84, #85, #86) — the things that read as broken.
What's left:

### Blocked on you

- [ ] **"Why I made this" in your own words.** The home page carries my
      placeholder.
- [ ] **A real board on the home page.** Screenshots or a live demo instead of
      describing one. Wants a board worth showing, which wants #65.

### Mine

- [ ] **Print material for venues.** The admin QR is a bare code: no venue
      name, no "draw something", no today's code beside it. A café needs
      something it can put on a table without designing it themselves.
- [ ] **The favicon is still create-next-app's.** Needs a DrawPin mark — a
      branding call, so say what you want and I'll build it.
- [ ] **Previews for the pages inside a board.** The board and the home page
      now show a card; `/draw`, `/vote` and the Hall of Fame still inherit the
      generic title. "Come vote for mine" is a link people send, so it should
      say Vote rather than repeat the board's name.
- [ ] **Remaining screens at phone width**: `/welcome`, the monthly final with
      real finalists, and the empty states nobody has seen yet.

---

## 3. Owner-facing gaps

Things an owner will hit that v1 doesn't answer. None are filed yet.

- [ ] **Rename the board.** The venue name is set once at setup and never
      again — a typo, a rebrand, or "Corner Coffee" becoming "Corner Coffee &
      Wine" all need a support conversation today. Belongs on the owner screen
      next to Pause.

      Renaming changes the **name only**. The slug is generated once at setup
      (`makeSlug` in `src/app/setup/create-venue.ts`) and stored; the QR code
      encodes `/b/<slug>`; the daily code is keyed by venue and time window and
      never touches either. So a rename reprints nothing, and the field should
      say so: _"Your board link and QR code stay the same."_ That's the right
      trade, because a printed QR is the one thing in this product we can't
      deploy a fix to — a café with twenty table tents and a window sticker
      pays for every broken code.

- [ ] **Change the board link.** The other half, and a different thing
      entirely: after a rename the URL still carries the old name, which is
      fine for a test board and not for a real café. This one _does_ invalidate
      printed codes, so it needs the loud warning the rename doesn't — and old
      slugs must keep redirecting to the new one, or every table tent, saved
      bookmark and shared chat link dies at once. Needs somewhere to keep
      former slugs, which is a schema change rather than a form field.
- [ ] **Change the board's time zone.** Also set once at setup, and it decides
      every 4:00 AM day and week boundary. Picking the wrong one silently shifts
      the whole cycle, and there's no way back.
- [ ] **Close a board and delete its data.** The privacy policy tells people
      their drawings are theirs, and there's no path for an owner to shut a
      board down or for a customer to delete their account. Decided already:
      Hall of Fame entries survive an account deletion (they're the venue's
      history, not just the person's).
- [ ] **Block an account from a board.** `docs/PLAN.md` calls this the natural
      next step once reporting is real. Reporting is real now.

---

## 4. In flight elsewhere

- **Moderation** — a drawing-aware nudity check alongside OpenAI (ADR-005),
  being built in the `feat/nsfw-drawing-check` worktree. Not mine; noted so the
  list is complete.

---

## 5. After v1

From `docs/PLAN.md`, Back pocket — not v1, in rough order of how soon they're
worth pulling forward.

- [ ] **#57 — download your own drawings.** The one worth doing first:
      everything but a winner is deleted 30 days after voting, so a screenshot
      is currently the only way anyone keeps what they drew. A guest sees the
      option and is asked to sign in when they tap it. The catch to solve first
      is that signing in doesn't make a guest tile yours — the account has to
      adopt what the device posted.
- [ ] **#44 — saved drawings and profile history.** Follows directly from the
      same adoption problem.
- [ ] **#50 — more ways to sign in.** Facebook, Apple, email codes,
      passkeys. Google is the only provider in v1; anyone without one still
      draws as a guest, which means they can't be voted for, win, vote or
      report — the whole competition is closed to them.
- [ ] **Sign in with any email address, not just Google.** The most inclusive
      of those, and now the cheapest: #41 put working custom SMTP in place, so
      an emailed code needs no third-party provider, no consent screen and no
      review. Worth pulling ahead of Facebook and Apple for that reason alone.
      (A Google account doesn't require a Gmail address — any address can
      become one — but "go make a Google account first" is still where people
      give up.)
- [ ] Weekly prompt mode ("challenges"), live jam mode, location checks, Google
      sign-in for owners, multi-location owners, a wall display.

---

## 6. Housekeeping

- [ ] **Repo showcase** — README, a demo and the system-design write-up, saved
      for the end of v1 so it describes what shipped.
- [ ] **Vercel's recommended DNS records.** It prefers `216.198.79.1` and a
      project-specific CNAME over the legacy pair we're on. Vercel says the
      current ones keep working; worth switching on a quiet day.
- [ ] **Decide what data previews start with.** `drawpin-preview` has the
      schema and nothing else, so a preview has no board to look at. Seeding it
      the way the local database is seeded — a venue, a few weeks, some tiles —
      would make previews useful for reviewing UI work.
- [ ] **Rotate the OpenAI API key before 2026-12-16.** 90-day expiry, created
      2026-09-17. A reminder is scheduled for 2026-12-10. Posting is refused
      while moderation is unreachable, so an expired key stops posting entirely.
