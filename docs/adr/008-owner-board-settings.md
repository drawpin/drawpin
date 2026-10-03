# ADR-008: Owners Can Fix a Board's Link, Time Zone and Members

## Status
Accepted. Adds to the owner admin in `docs/PLAN.md` (v10), which listed five
things only. Built one at a time, in this order: link, time zone, blocking.
Closing a board and deleting its data is still to be decided.

## Context
The owner screen was cut to the bare minimum for v1. Three things owners will
hit had no answer:

- **The link keeps the old name after a rename.** The slug is generated once
  at setup and the rename (#105) deliberately leaves it alone, because the QR
  code encodes it. Fine for a test board, wrong for a real one.
- **A wrong time zone is permanent.** It decides every 4:00 AM day and week
  boundary, and it's set once at setup.
- **Reporting is real, and blocking isn't.** An owner can remove a tile but
  can't stop the account that posted it from posting the next one.

## Decision

### Changing the link
- The new link is built from the board's **current name** with a fresh
  four-character ending, the way setup builds the first one. The owner doesn't
  type it, so there's nothing to moderate and no name to squat.
- It's offered only when the link no longer matches the name.
- **Old links redirect for good.** Every slug a board has had is kept in
  `former_slugs`; board pages answer one with a permanent redirect to the same
  page at the current slug, and posting or voting from a page opened before
  the change still lands on the right board.
- **A slug is never reused.** One namespace spans `venues.slug` and
  `former_slugs`, enforced in the database, so a new board can never pick up
  an old board's printed QR codes.
- The change asks first: the QR code changes, and the old one, while it still
  works, shows a link with the old name.

### Changing the time zone
- Any time, taking effect **from the next week**. The current week keeps its
  boundaries, so nobody loses a day or gets a double one partway through.

### Blocking an account
- A blocked account can't post, vote or report on that board, and blocking
  **also removes their live tiles** there, the same way a single removal
  does (a removed winner's week is re-crowned from what's left). The owner
  can unblock; removed tiles don't come back.

## Consequences
- `former_slugs` grows by one row per change and is never pruned. Changes are
  rare and the rows are tiny.
- Closing a board (still to come) has to decide what happens to its former
  slugs: deleted with the board, they become free for a new board to take.
- An owner can change the link as often as they rename. Each change is
  logged with the old and new slug, as renames are.
