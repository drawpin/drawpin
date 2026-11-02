# ADR-015: Profiles, Navigation and Remembered Boards

## Status
Accepted (2026-11-02, by the owner). Extends ADR-004 and ADR-013; part of
docs/PLAN.md v20.

## Context
DrawPin was built around one printed board and a one-off visit:
- Every visit starts from a QR scan or a typed 8-digit code. Nothing
  remembers the boards someone uses, so a regular re-scans every time and a
  member of several groups juggles several codes.
- There is no navigation between areas. The home page, a board, Your
  drawings (`/account`) and the owner screen (`/admin`) are islands, each
  with its own back link.
- There's nowhere that is "yours": drawings, wins and boards are spread
  across pages.

The owner wants DrawPin to be an app people come back to, with one account,
one sign-in, and their boards one tap away.

## Decision

### A sidebar on every page
- **Desktop:** a persistent left sidebar. **Phone:** a drawer opened from a
  header button. On the full-screen draw step it stays closed and the
  button is the only way in, so it never takes space or gestures from the
  canvas. The print view has none.
- **Signed out:** join with a code, recent boards on this device, start a
  board, sign in, and the About, Terms and Privacy links.
- **Signed in:** you (username#tag, linking to the profile hub), home, your
  boards (pinned first, with a status dot and an owner badge), join with a
  code, the boards you run with Start a board, your drawings, and the
  account (sign out, delete).

### A private profile hub
Your username and tag, joined date and username change; stats (drawings
posted, weekly wins, super wins, boards drawn on); your drawings grouped by
board, with the PNG download (#57); a trophy shelf of your wins; and the
account's delete flow. It grows out of `/account`.

**Profiles are private.** The hub is for its owner alone; nobody else ever
sees a profile page, and there is no following. A drawing still shows its
username#tag on the board, as before.

### A home hub
For a signed-in account: "today" cards for its boards (draw today, vote on
last week, the monthly final, a result not yet seen), pinned and recent
boards with their latest tiles, join with a code and Start a board. PLAN's
"Opening the app shows a vote prompt" moves here, across all your boards.

### Landing
Whether a returning signed-in visitor opening `/` lands on the hub or on the
marketing home (with the sidebar) is one constant, `HUB_LANDING`, so the
owner can flip it at review. The default sends returning signed-in accounts
to the hub and everyone else to the marketing home. First-time and
signed-out visitors always get the marketing home.

### Recent and pinned boards
- **Recorded automatically.** Opening a board (its board, draw, vote or
  final page) records a visit.
  - **Signed in:** on the account, in `board_visits`, one row per account
    and board with when it was last opened. RLS lets an account read and
    change only its own rows; no other account, and nobody signed out, can
    see them.
  - **Signed out:** on the device, in a first-party cookie
    (`drawpin_boards`) holding board slugs and when each was last opened,
    nothing else: no account, device or tracking id. Slugs are already
    public, printed under every QR code. The format is versioned (`v1`) and
    parsed defensively: anything malformed is dropped, never trusted
    (`src/lib/device-boards.ts`).
  - **At sign-in** the device's list merges into the account. A former slug
    counts as its board, a visit only moves forward in time, and a board the
    account removed comes back only if the device opened it since.
- **Pin** up to 5 boards to the top, from the sidebar row or the board
  header.
- **Remove from my boards** hides a board, and unpins it, until it's opened
  again.
- **Order:** pinned first, in the order they were pinned, then by last
  visit. The list shows 20; older entries drop off the list.
- **Board changes show through:** a renamed board shows its new name, a
  changed link its new slug, and a closed board disappears, since its
  visits cascade with it.

## Consequences
- One new table, `board_visits` (docs/ERD.md), granted to `authenticated`
  only. The app writes it through the server like every other table; the
  policies are the backstop.
- The privacy page says what is remembered about the boards you open: on the
  account when signed in, on the device otherwise.
- The per-page back links go once the sidebar is everywhere.
- The status dots and today cards cover in-app reminders; notifications and
  emails (#198, #199) stay out of scope, as do public profiles, following,
  avatars and board discovery: boards stay unlisted, reached by code, QR or
  link.
