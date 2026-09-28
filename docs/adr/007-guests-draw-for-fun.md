# ADR-007: Guests Draw for Fun; Only Accounts Post

## Status
Accepted. Changes the "Draw a tile" row of ADR-004: a guest can still draw,
but a guest drawing no longer goes on the board.

## Context
ADR-004 let anyone post a tile without an account. A guest tile went on the
board marked as not in the running, limited to one a day by the device stack:
a signed cookie, a hashed fingerprint and a hashed IP.

The first test board, shared with about 40 people, showed the cost of that:

- Every harmful tile on it, and both photos someone swapped in for a drawing
  (a selfie and a stock photo), were posted as guests.
- A guest is only as limited as their device. Private browsing, another
  browser or cleared cookies make a new guest, so the one-a-day limit and the
  three-strikes lockout slow a determined person down rather than stop them.
- A guest can't be held to anything afterwards. There's no account to report,
  and nothing links one guest tile to the next.

Guest tiles were also never worth much on the board: they couldn't be voted
for or win, so they took space without taking part.

## Decision
Posting needs a Google sign-in. A guest can open a board, see it, and draw as
much as they like on the drawing screen, but the drawing stays on their
device.

- **The server refuses a guest post** in `postTileAction`, before a device
  is created and before anything is moderated or stored. `postTile` takes a
  required `userId`, so there's no guest path left in it.
- **The drawing screen says so up front.** A guest sees "Sign in to post"
  above the canvas and, where the Post button would be, a line saying guest
  drawings don't go on the board. The guest name field is gone.
- **A guest's drawing doesn't carry over a sign-in.** Signing in leaves the
  page for Google, which loses the canvas. Saving it across the redirect
  would mean restoring an image from browser storage, which is a way to post
  a picture that wasn't drawn, so the prompt sits above the canvas to be seen
  before anything is drawn.
- **Existing guest tiles stay** until the normal clean-up deletes them, 30
  days after their week's voting ends. The code that shows and skips them
  (`isGuest`, "Guest" labels, unvotable tiles) stays until then;
  `tiles.user_id` stays nullable for the same reason.
- **Today's limits apply only to signed-in visitors on the drawing page.** A
  guest who can't post isn't told they've already posted.

## Consequences
- Anyone without a Google account can no longer take part in the board, only
  play with the drawing tools. Other ways to sign in (#50, and email codes)
  matter more now.
- Every tile on a board belongs to an account, so a report or a removal
  always points at someone, and the per-account daily limit applies to
  everything posted.
- It doesn't stop a signed-in person swapping a photo in for their drawing.
  The server still accepts any image it's sent (see `TODO.md`).
- Nothing about a guest is stored any more: no device row, cookie or hashes
  until they sign in and post. The privacy page says so.
