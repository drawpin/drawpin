# ADR-014: A Board Keeps One Code Until Its Owner Makes a New One

## Status
Accepted (2026-10-06, by the owner). Replaces the daily join code in
docs/PLAN.md (Joining) and the "Daily join code" row of ADR-003.

## Context
Through v17, each board's 8-digit join code changed every day at 4:00 AM
board time. The idea was that a code seen on a table one day would be
useless the next, so it couldn't be passed around.

In practice it was friction:
- Owners had to open the owner screen every day to find out the new code
  and pass it on.
- It couldn't be printed. The table tent and poster could only say "type
  today's code", which sends people who can't scan to ask someone.
- Groups that aren't a place with tables (a class, a group chat) share the
  code once, in a message, and a code that dies overnight breaks that.

## Decision
Each board has **one permanent 8-digit code**, kept until the owner makes a
new one.

- **Existing boards keep the code that is live when the change ships.** The
  migration turns today's code into the permanent one, so nobody who already
  has it is locked out. A board with no live code gets one the first time
  the owner screen asks, as before (ADR-003: on demand, no cron).
- **The code is printed** on the table tent and poster, and on the card on
  the owner screen: "No camera? Go to drawpin.io and type 12345678."
- **"Make a new code"** on the owner screen is the remedy for a code that
  has got around. It asks first, like changing the board link; the old code
  stops working at once, and the owner is told to reprint. The QR code and
  the board link don't change.
- **The wrong-guess limit stays** and is the brute-force protection: wrong
  codes are counted per network (`code_attempts`) and cut off after 20 in
  ten minutes, so 100 million codes stay out of reach of a script whether
  they change daily or not.

## Consequences
- `daily_codes` keeps its name and shape. A live code is a row whose
  `valid_until` is `infinity`; replacing a code closes that row at the
  moment of the change and adds a new one, in one transaction
  (`replace_join_code`). A partial unique index allows one live code per
  board. Looking a code up is unchanged.
- Codes no longer depend on the board's time zone, so a time zone change
  (ADR-008) leaves the code alone. Days and weeks still turn over at 4:00 AM.
- Closing a board (ADR-009) still deletes its codes. A code that is no
  longer live, replaced or deleted, may one day be given to another board.
- A code that leaks stays valid until the owner notices and replaces it.
  That's the trade: the owner chose a printable code over a self-expiring
  one.
