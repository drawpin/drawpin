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
three of the four need you to open an account or pick up a phone first.

### Mine, once the door is open

- [ ] **#61 — preview deployments write to production data.** A second
      Supabase project (`drawpin-preview`, us-west-2) now holds the schema,
      and Vercel points previews at it instead. Left: confirm a preview really
      reads it, and decide what data previews should start with.
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
- [ ] **No link preview.** A board link pasted into a group chat shows a bare
      URL. Open Graph title, description and image.
- [ ] **Remaining screens at phone width**: `/welcome`, the monthly final with
      real finalists, and the empty states nobody has seen yet.

---

## 3. Owner-facing gaps

Things an owner will hit that v1 doesn't answer. None are filed yet.

- [ ] **Rename the board.** The venue name is set once at setup and never
      again — a typo, a rebrand, or "Corner Coffee" becoming "Corner Coffee &
      Wine" all need a support conversation today. The slug and the QR code
      stay the same, so renaming costs nothing and reprints nothing; that's the
      design point. Belongs on the owner screen next to Pause.
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
- [ ] **#50 — more ways to sign in.** Facebook, Apple, email codes, passkeys.
      Google is the only provider in v1; anyone without one still draws as a
      guest.
- [ ] Weekly prompt mode ("challenges"), live jam mode, location checks, Google
      sign-in for owners, multi-location owners, a wall display.

---

## 6. Housekeeping

- [ ] **Repo showcase** — README, a demo and the system-design write-up, saved
      for the end of v1 so it describes what shipped.
- [ ] **Vercel's recommended DNS records.** It prefers `216.198.79.1` and a
      project-specific CNAME over the legacy pair we're on. Vercel says the
      current ones keep working; worth switching on a quiet day.
- [ ] **Rotate the OpenAI API key before 2026-12-16.** 90-day expiry, created
      2026-09-17. A reminder is scheduled for 2026-12-10. Posting is refused
      while moderation is unreachable, so an expired key stops posting entirely.
