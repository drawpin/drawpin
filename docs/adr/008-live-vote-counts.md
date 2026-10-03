# ADR-008: Live Vote Counts on a Podium

## Status
Accepted (2026-10-03). Reverses "Live vote counts stay hidden until voting
closes" (docs/PLAN.md v7) for the weekly vote. The monthly final keeps its
counts hidden.

## Context
Voting on week N's board runs all of week N+1, and until now nobody could
see how it was going: the winner turned up in the Hall of Fame once voting
closed. Hiding the counts was meant to stop a bandwagon, where an early
leader on a small board keeps winning because people pile onto it.

During the UI pass the owner wanted the race visible instead: a Kahoot-style
top 3 at the head of the vote page. Three ways were weighed:

1. A live podium with counts, all week.
2. Live positions without counts.
3. Counts stay hidden, and the podium is revealed when voting closes.

## Decision
Option 1. The vote page shows the top 3 so far, with their vote counts,
to everyone, all week. The competition stays relevant while it's
happening, instead of everyone waiting a week for a result.

- **The order is the winner rule's**: most votes first, a tie to the
  earlier post, at least one vote to place (`rankPodium`). The tile on top
  when voting closes is the tile that wins.
- **Only tallies are shown.** The server reads `votes` with the service-role
  key and ranks them; who voted for what never leaves the server, and `votes`
  stays unreadable to the public roles (docs/ERD.md).
- **It updates on load and after voting**, not in real time: Realtime would
  need `votes` readable by the browser, which would expose voters.
- **The monthly final is unchanged.** It has at most 4 finalists and 1 vote
  each, so a live count there would mostly tell people who to pile onto.

## Consequences
- Accepted risk: the bandwagon. An early leader can snowball, more so on a
  small board. If that shows up in practice, option 2 (positions without
  counts) is the fallback and needs no data changes.
- Database functions and old migrations still say counts stay hidden; that
  remains true of the database itself, which only the server reads.
