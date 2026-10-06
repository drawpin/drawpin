# ADR-013: One Account Can Draw and Own a Board

## Status
Accepted (2026-10-06, by the owner). Supersedes ADR-004's rule that an
account is an owner or a customer, never both.

## Context
ADR-004 made owners and customers two separate roles on one auth system:
an account had an `owners` row or a `profiles` row, never both, and the
owner pages decided who was an owner from the sign-in method (email for
owners, Google for customers).

Two things broke that:
- ADR-010 let customers sign in with an emailed code, so the sign-in method
  no longer told the roles apart.
- Once most visitors had a drawing account, "Start a board" and "Manage my
  board" stopped working for them (#173): `/login` sent any signed-in
  account to `/admin`, then `/setup`, which turned non-owners away to the
  home page. The first fix (#174) showed them the owner sign-in and asked
  for a different email, which the owner rejected: people who draw should
  be able to run a board with the same account.

## Decision
One account can both draw and own a board.

- **Start a board / Manage my board:** anyone signed in goes to `/admin`,
  which shows their board, or sends them to `/setup` if they don't have
  one. `/setup` accepts any signed-in account. Signed-out visitors get the
  email sign-in as before.
- **Who owns a board** is decided by the data: an `owners` row and a venue
  whose `owner_id` is the account. The sign-in method no longer matters.
- **One board per account** still holds (docs/PLAN.md).
- **Closing a board (ADR-009)** deletes the board and its owner row; it
  deletes the sign-in only if the account doesn't also draw (has no
  profile). Someone who draws keeps their drawings, votes and sign-in.
- **Deleting a drawing account** is refused while the account owns a board,
  with a message to close the board first. Deleting the sign-in would
  otherwise take the board with it, since `owners.id` cascades from
  `auth.users`.

## Consequences
- No schema change: nothing in the database enforced "never both".
- A Google account can now own a board. Owners who sign in by email keep
  doing so.
- The planned profile hub and universal sign-in (TODO.md, #169, #44) build
  on this: one account, one place for everything it does.
