# ADR-004: Customer Accounts with Google Sign-In

## Status
Accepted

## Context
`docs/PLAN.md` through v7 had **no customer accounts**: "no app download, no
user accounts" was part of the premise, and identity was approximated by a
layered device stack — a signed device cookie (#8), a hashed browser
fingerprint and hashed IP (#24), and Cloudflare Turnstile (#23).

That stack works for what it was built for, but three things it can't do are
all in phase 3 or immediately after it:

- **Voting across devices.** Votes keyed to a device mean someone who votes on
  their phone can vote again on a laptop, and someone who posted on one device
  can vote for their own tile from another. Plan v7 recorded this as a known
  limitation of the weekly cycle.
- **Reporting.** A report from an anonymous device is unattributable and
  trivially repeatable, so v7 explicitly had no report button — the owner's
  "Remove tile" was the only backstop.
- **Anything that belongs to a person over time**: a stable username instead of
  a per-device `Ahmad#4821` tag, the drawings you've posted, the winners you
  voted for.

Voting, winners and the monthly final all write rows that belong to *someone*.
Building them against devices and adding accounts afterwards means designing
each of them twice.

The obvious objection to accounts is the front door. A printed QR that opens a
sign-in screen loses the customer who would have drawn something in the thirty
seconds they were waiting for coffee, and that first drawing is what makes the
board worth looking at.

## Decision
Add **customer accounts via Google sign-in**, and gate the **competition**
rather than the door.

| | Anonymous | Signed in |
|---|---|---|
| See the board | yes | yes |
| Draw a tile | yes, shown as a guest | yes, under their username |
| Be voted for, and win | **no** | yes |
| Vote | **no** | yes, from any device |
| Report a tile | **no** | yes |

Supporting rules:

- **Google only** to start. Owners keep their existing email magic link.
- **Both limits apply to a signed-in post**: it must pass the account's daily
  limit *and* the device's. Accounts make the limit stricter rather than
  replacing the device stack, which still carries anonymous posting.
- **Votes are per account per week**, not per device.
- **Anonymous tiles are not votable and not eligible to win.** They appear on
  the board, marked as guest drawings, and are deleted with the rest of the
  non-winning tiles after 30 days.

## Rationale
- Keeps the premise that made the product worth building: a stranger can scan,
  draw and be on the board without an account.
- Puts identity exactly where identity matters — voting integrity, winners,
  reporting — and nowhere else.
- Creates the nudge for free. A guest sees "sign in to be in the running" beside
  their own tile, at the moment they care about it.
- Google sign-in is one tap on both phone platforms, costs nothing, and is
  harder to mass-create than an email address, which is what makes an account
  limit mean anything. Apple sign-in would cost $99/year and can be added later
  if iPhone customers balk at Google.

## Alternatives considered
- **Keep devices only** (v7). Cheapest, but leaves cross-device voting broken by
  design and rules out reporting, which is the owner's only real recourse
  against a repeat poster.
- **Require an account for everything.** Strongest and simplest — one identity
  path, no device stack for posting — but a sign-in wall behind a printed QR is
  where most customers stop.
- **Fully optional accounts** (sign in for perks, anonymous can still vote and
  win). Keeps the door widest, but leaves voting device-keyed, so the
  limitation this ADR exists to fix survives.
- **Email magic link for customers.** No third party, but a new inbox is a new
  account, and "leave the app, find the email, come back" is heavy friction for
  someone standing at a counter.

## Consequences
- **The owner-creation trigger has to move.**
  `supabase/migrations/20260916204754_create_owner_on_signup.sql` creates an
  `owners` row for every new `auth.users` row. Once customers sign in, every
  customer becomes an owner. The row must be created when a venue is set up
  instead, and `/setup` must be gated accordingly. This is a prerequisite, not
  a follow-up.
- **RLS gets a second kind of authenticated user.** Policies written as "the
  signed-in user" currently mean "the owner". Every one of them has to
  distinguish an owner from a customer, and `docs/ERD.md`'s policy matrix needs
  a customer column.
- **Two posting paths to maintain**, anonymous and signed-in, including two
  ways a tile gets its display name.
- **The board becomes a mix** of competing and non-competing tiles, which the
  voting screen and the board have to show clearly without making guests feel
  second-class.
- **Customer personal data now exists** (Google account email, held by Supabase
  Auth). Deleting an account deletes that person's tiles and votes; Hall of Fame
  entries stay, shown without a name, because they're part of the venue's
  history.
- Supabase's free tier allows far more monthly active users than this will see,
  so sign-in adds no cost.
