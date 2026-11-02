/**
 * What's waiting for a signed-in account on each of its boards (ADR-015):
 * the status dot in the sidebar and the hub's "Today" cards.
 *
 * Everything is worked out from the clock, the way the board itself does it
 * (ADR-003): nothing runs at 4:00 AM to flip a stored status. The store
 * below reads every board's facts in a handful of queries, batched by venue
 * id, so a list of 20 boards costs the same round trips as one.
 */

import { VOTES_PER_WEEK } from "@/app/b/[slug]/vote/cast-votes";
import { closedFinals, openFinal } from "./monthly-final";
import { localDayFor, type VenueClock, zoneAt } from "./venue-time";

/**
 * What's waiting on a board, most urgent first when several apply:
 * the monthly final (rarest, and time-boxed), then votes, then today's
 * drawing, then results not yet seen. `null` is nothing waiting.
 */
export type BoardStatus = "final" | "vote" | "draw" | "results" | null;

/** A board's status, with what its words need. */
export type BoardStatusInfo = {
  status: BoardStatus;
  /** Votes still to cast on last week's drawings, when `status` is "vote". */
  votesLeft?: number;
  /**
   * The results showing on the board this week, as the ids the board's
   * reveal plays under (`drawpin:reveal:<id>`). "Results are in" only while
   * one of them hasn't been seen on this device, which only the browser
   * knows, so the client has the last word (see `StatusLine`).
   */
  revealIds: string[];
};

/** The status of a board with nothing waiting. */
export const NO_STATUS: BoardStatusInfo = { status: null, revealIds: [] };

/** The facts about one board that decide its status for one account. */
export type BoardFacts = {
  isPaused: boolean;
  /** The account has posted here today (the 4:00 AM local day). */
  postedToday: boolean;
  /** Last week's drawings are open for voting. */
  votingOpen: boolean;
  /** The account's votes on them so far. */
  votesCast: number;
  /** Drawings it could vote for: live, signed in, and not its own. */
  votableTiles: number;
  /** A monthly final is being voted on. */
  finalOpen: boolean;
  votedInFinal: boolean;
  /** Results showing this week (see {@link BoardStatusInfo.revealIds}). */
  revealIds: string[];
};

/** Picks the one status a board shows, in precedence order. */
export function statusFromFacts(facts: BoardFacts): BoardStatusInfo {
  const revealIds = facts.revealIds;
  if (facts.finalOpen && !facts.votedInFinal) {
    return { status: "final", revealIds };
  }

  const votesLeft = facts.votingOpen
    ? Math.min(
        Math.max(VOTES_PER_WEEK - facts.votesCast, 0),
        facts.votableTiles,
      )
    : 0;
  if (votesLeft > 0) return { status: "vote", votesLeft, revealIds };

  if (!facts.isPaused && !facts.postedToday) {
    return { status: "draw", revealIds };
  }
  if (revealIds.length > 0) return { status: "results", revealIds };
  return { status: null, revealIds };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When the account last opened a board, in words: "Today", "Yesterday",
 * "3 days ago", "Last week", then "{n} weeks ago". Counted in whole days
 * since the visit, so the server and the browser agree whatever their time
 * zones.
 */
export function lastVisitLabel(lastVisitedAt: string, now: Date): string {
  const days = Math.max(
    0,
    Math.floor((now.getTime() - new Date(lastVisitedAt).getTime()) / DAY_MS),
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  return `${Math.floor(days / 7)} weeks ago`;
}

/** The words for a status, or `null` for none. */
export function statusWords(info: {
  status: BoardStatus;
  votesLeft?: number;
}): string | null {
  switch (info.status) {
    case "final":
      return "Final is open";
    case "vote": {
      const left = info.votesLeft ?? 0;
      return `${left} ${left === 1 ? "vote" : "votes"} left`;
    }
    case "draw":
      return "Draw today";
    case "results":
      return "Results are in";
    default:
      return null;
  }
}

/** A board's clock and whether it's paused. */
export type StatusBoard = {
  venueId: string;
  isPaused: boolean;
  clock: VenueClock;
};

/** A week, as far as statuses care. */
export type StatusWeek = {
  id: string;
  venueId: string;
  startsAt: string;
  postingEndsAt: string;
  votingEndsAt: string;
};

/** A monthly final that exists in the database. */
export type StatusFinal = {
  id: string;
  venueId: string;
  month: string;
};

/**
 * The reads statuses need. Every method takes the whole batch of boards (or
 * weeks, or finals) at once; none is called per board.
 */
export interface BoardStatusStore {
  listBoards(venueIds: string[]): Promise<StatusBoard[]>;
  /** The boards' weeks whose voting ended after `since`, or hasn't yet. */
  listWeeks(venueIds: string[], since: Date): Promise<StatusWeek[]>;
  /** Which of the boards the account posted to on any of these local days. */
  listPostedDays(
    userId: string,
    venueIds: string[],
    localDays: string[],
  ): Promise<{ venueId: string; localDay: string }[]>;
  /** The account's votes per week. */
  countMyVotes(userId: string, weekIds: string[]): Promise<Map<string, number>>;
  /** Live, signed-in drawings per week that aren't the account's own. */
  countVotableTiles(
    userId: string,
    weekIds: string[],
  ): Promise<Map<string, number>>;
  /** The boards' finals for any of these months. */
  listFinals(venueIds: string[], months: string[]): Promise<StatusFinal[]>;
  /** The finals the account has voted in. */
  listFinalsVotedIn(userId: string, finalIds: string[]): Promise<Set<string>>;
  /** The weeks with at least one vote, so a result to reveal. */
  listWeeksWithVotes(weekIds: string[]): Promise<Set<string>>;
  /** The finals with at least one vote. */
  listFinalsWithVotes(finalIds: string[]): Promise<Set<string>>;
}

/** How long a result stays on the board after its voting closes. */
const RESULTS_SHOWN_MS = 7 * DAY_MS;

/**
 * How far back weeks are read: far enough for every week of a month whose
 * final is open now (a final closes about three weeks into the next month).
 */
const WEEKS_LOOKBACK_MS = 70 * DAY_MS;

/** Where each board is in its cycle, from its own weeks and clock. */
type Cycle = {
  board: StatusBoard;
  localDay: string;
  votingWeekId: string | null;
  openFinalMonth: string | null;
  closedFinalMonth: string | null;
  closedWeekId: string | null;
};

function cycleFor(board: StatusBoard, weeks: StatusWeek[], now: Date): Cycle {
  const timeZone = zoneAt(board.clock, now);
  const at = now.getTime();
  const since = at - RESULTS_SHOWN_MS;
  const timings = weeks.map((week) => ({
    startsAt: week.startsAt,
    votingEndsAt: week.votingEndsAt,
  }));

  const votingWeek = weeks.find(
    (week) =>
      new Date(week.postingEndsAt).getTime() <= at &&
      at < new Date(week.votingEndsAt).getTime(),
  );
  // The latest week whose voting closed in the last seven days, as the
  // board's reveal picks it.
  const closedWeek = weeks
    .filter((week) => {
      const end = new Date(week.votingEndsAt).getTime();
      return end <= at && end > since;
    })
    .sort(
      (a, b) =>
        new Date(b.votingEndsAt).getTime() - new Date(a.votingEndsAt).getTime(),
    )[0];
  const closedFinal = closedFinals(timings, timeZone, now).find(
    (window) => window.endsAt.getTime() > since,
  );

  return {
    board,
    localDay: localDayFor(now, timeZone),
    votingWeekId: votingWeek?.id ?? null,
    openFinalMonth: openFinal(timings, timeZone, now)?.month ?? null,
    closedFinalMonth: closedFinal?.month ?? null,
    closedWeekId: closedWeek?.id ?? null,
  };
}

const unique = <T>(values: (T | null)[]): T[] => [
  ...new Set(values.filter((value): value is T => value !== null)),
];

/**
 * Each board's status for one account, in a fixed number of batched reads
 * whatever the number of boards. Boards that no longer exist are left out.
 *
 * @param venueIds - The account's boards, e.g. from `listMyBoards`.
 */
export async function loadBoardStatuses(
  userId: string,
  venueIds: string[],
  store: BoardStatusStore,
  now: Date = new Date(),
): Promise<Map<string, BoardStatusInfo>> {
  const statuses = new Map<string, BoardStatusInfo>();
  if (venueIds.length === 0) return statuses;

  const [boards, weeks] = await Promise.all([
    store.listBoards(venueIds),
    store.listWeeks(venueIds, new Date(now.getTime() - WEEKS_LOOKBACK_MS)),
  ]);
  const cycles = boards.map((board) =>
    cycleFor(
      board,
      weeks.filter((week) => week.venueId === board.venueId),
      now,
    ),
  );
  const ids = cycles.map((cycle) => cycle.board.venueId);

  const votingWeekIds = unique(cycles.map((cycle) => cycle.votingWeekId));
  const closedWeekIds = unique(cycles.map((cycle) => cycle.closedWeekId));
  const months = unique(
    cycles.flatMap((cycle) => [cycle.openFinalMonth, cycle.closedFinalMonth]),
  );

  const [posted, myVotes, votable, finals, weeksWithVotes] = await Promise.all([
    store.listPostedDays(
      userId,
      ids,
      unique(cycles.map((cycle) => cycle.localDay)),
    ),
    store.countMyVotes(userId, votingWeekIds),
    store.countVotableTiles(userId, votingWeekIds),
    months.length > 0 ? store.listFinals(ids, months) : [],
    store.listWeeksWithVotes(closedWeekIds),
  ]);

  const finalFor = (venueId: string, month: string | null) =>
    month === null
      ? undefined
      : finals.find((row) => row.venueId === venueId && row.month === month);
  const openFinalIds: string[] = [];
  const closedFinalIds: string[] = [];
  for (const cycle of cycles) {
    const open = finalFor(cycle.board.venueId, cycle.openFinalMonth);
    const closed = finalFor(cycle.board.venueId, cycle.closedFinalMonth);
    if (open) openFinalIds.push(open.id);
    if (closed) closedFinalIds.push(closed.id);
  }

  const [votedFinals, finalsWithVotes] = await Promise.all([
    store.listFinalsVotedIn(userId, openFinalIds),
    store.listFinalsWithVotes(closedFinalIds),
  ]);

  for (const cycle of cycles) {
    const venueId = cycle.board.venueId;
    const openFinalRow = finalFor(venueId, cycle.openFinalMonth);
    const closedFinalRow = finalFor(venueId, cycle.closedFinalMonth);

    // The monthly result plays before the weekly one, as on the board.
    const revealIds: string[] = [];
    if (closedFinalRow && finalsWithVotes.has(closedFinalRow.id)) {
      revealIds.push(`final:${closedFinalRow.id}`);
    }
    if (cycle.closedWeekId && weeksWithVotes.has(cycle.closedWeekId)) {
      revealIds.push(`week:${cycle.closedWeekId}`);
    }

    statuses.set(
      venueId,
      statusFromFacts({
        isPaused: cycle.board.isPaused,
        postedToday: posted.some(
          (row) => row.venueId === venueId && row.localDay === cycle.localDay,
        ),
        votingOpen: cycle.votingWeekId !== null,
        votesCast: cycle.votingWeekId
          ? (myVotes.get(cycle.votingWeekId) ?? 0)
          : 0,
        votableTiles: cycle.votingWeekId
          ? (votable.get(cycle.votingWeekId) ?? 0)
          : 0,
        // The board offers its final whenever the window is open, whether
        // or not anyone has opened it yet, so the status does too.
        finalOpen: cycle.openFinalMonth !== null,
        votedInFinal: openFinalRow ? votedFinals.has(openFinalRow.id) : false,
        revealIds,
      }),
    );
  }
  return statuses;
}
