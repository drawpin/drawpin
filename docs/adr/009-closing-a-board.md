# ADR-009: Closing a Board Deletes Everything

## Status
Accepted. Completes the owner settings in ADR-008 and `docs/PLAN.md` (v11).

## Context
The privacy policy tells people their drawings are theirs, and there was no
way for an owner to shut a board down. A board holds drawings, votes and
reports from people who aren't the owner, and its Hall of Fame is meant to
be kept forever while the board runs.

ADR-008 left one question open: what happens to a closed board's former
links. If they're deleted with it, a new board can take one and inherit the
old board's printed QR codes.

## Decision
- **Closing a board deletes everything on it**: every tile and image, every
  week, vote, final and report, the Hall of Fame, its join codes, blocks and
  former links, and the owner's sign-in. An owner closing a board means it.
- **Links aren't reserved.** A closed board's slugs, current and former, are
  free for a new board. Printed codes for a closed board may one day open a
  different one; reserving them for ever was judged not worth it.
- **The owner types the board's name to confirm**, after a first tap that
  only lists what goes.
- **Order:** images first, so a Storage failure leaves the board as it was
  for another try rather than leaving files nothing points to; then one
  transaction in the database (`close_venue`); then the sign-in, which is
  logged rather than fatal if it fails, since without its owner row it opens
  nothing.
- The accounts that drew on the board are untouched; only their activity on
  this board goes. Deleting a customer account is separate.

## Consequences
- There is no undo, and no grace period.
- `hall_of_fame.tile_id` stays `on delete restrict`, which keeps the 30-day
  purge from ever deleting a winner; `close_venue` clears the Hall of Fame
  explicitly first.
- Devices that only ever posted to the closed board are forgotten by the
  daily clean-up after 90 days, as unused devices already are.
