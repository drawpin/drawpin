# ADR-016: Several Boards per Account

## Status
Accepted (2026-11-02, by the owner). Supersedes "one board per owner"
(docs/PLAN.md through v19, and ADR-013). Extends ADR-009 and ADR-013 on
closing a board. Part of docs/PLAN.md v20.

## Context
Through v19 an account could run one board, enforced by a unique key on
`venues.owner_id`. A person who runs more than one group (an office and a
group of friends, two classes) had to use a second email address for the
second board, and a second sign-in to switch between them. With one account
for everything (ADR-013, ADR-015), that's the last place a person is pushed
into a second account.

## Decision
- **Up to 5 boards per account.** The cap is a server constant,
  `MAX_BOARDS_PER_ACCOUNT` in `src/lib/my-boards.ts`, so it's easy to raise.
  The database holds it too: a trigger on `venues`
  (`venues_enforce_board_limit`) refuses a sixth board, locking the
  account's owner row first so two boards created at once can't both get
  in. The two must agree, and are raised together.
- **Setup** (`/setup`: name, time zone, moderation level) creates another
  board while the account is under the cap. Start a board in the sidebar
  goes straight there for a signed-in account, and is hidden at the cap.
- **The owner screen is per board, at `/admin/[slug]`.** Inside, it's
  unchanged: QR and code, pause, remove, reports, rename, link, time zone,
  block, rules, close. Every owner action resolves the board from the route
  and checks it belongs to the signed-in account. A former slug redirects
  to the current one, as board pages do.
- **`/admin`** lists the account's boards, and goes straight to the board
  when there's only one, so a one-board owner sees no extra step. With
  none, it goes to `/setup` as before.
- **Closing a board leaves the account's other boards alone.**
  `close_venue` deletes the board it's given, and the account's owner row
  only with its last board. The sign-in is deleted only when that was the
  account's last board **and** the account has no profile (it doesn't
  draw), extending ADR-009 and ADR-013. Otherwise the person keeps their
  sign-in, their other boards, their drawings and their votes.
- **Google sign-in for owners.** Owners sign in like everyone else: Google
  or an emailed code. It leaves the back pocket. Ownership stays data, an
  `owners` row and venues pointing at it (ADR-013), never the sign-in
  method.
- Still out: several owners or staff on one board.

## Consequences
- The unique key on `venues.owner_id` is gone; a plain index keeps the
  owner's lookups and the cascade from `owners` quick.
- Code that read "the owner's board" with `.single()` or `.maybeSingle()` on
  `owner_id` assumes one board. Until the per-board owner screen ships,
  `/setup` keeps sending an account that already has a board to `/admin`,
  so no account gets a second board before the screens can show it.
- Deleting a drawing account is still refused while it owns any board
  (ADR-013); the message asks to close them first.
