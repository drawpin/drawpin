/**
 * The home hub's data, shaped for the page (ADR-015; docs/design/profiles.md,
 * section 3): what's waiting today across an account's boards, and the
 * boards themselves with their latest drawings. Pure, so the ordering and
 * the words are tested without a database; the reads are in
 * `src/app/_hub/load-hub.ts`.
 */

import type { BoardStatus } from "./board-status";
import { openFinal } from "./monthly-final";
import { MAX_BOARDS_PER_ACCOUNT } from "./my-boards";
import type { SidebarBoard } from "./sidebar-boards";
import { type VenueClock, weekdayFor, zoneAt } from "./venue-time";

/** What the hub knows about one board beyond its status. */
export type BoardDetail = {
  /** Live drawings in the week taking posts now. */
  drawingsThisWeek: number;
  /** The newest few of last week's drawings, while they're being voted on. */
  votingPeek: string[];
  /** The weekday voting closes, e.g. "Monday", while it's open. */
  votesCloseOn: string | null;
  /** The month an open final judges, e.g. "October". */
  finalMonth: string | null;
};

/** A board's week, as the hub reads it. */
export type DetailWeek = {
  startsAt: string;
  postingEndsAt: string;
  votingEndsAt: string;
  liveCount: number;
  /** Image URLs of its newest live drawings, newest first. */
  peek: string[];
};

/** "2026-10-01" → "October". The month is a calendar date, so no zone. */
function monthName(month: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${month}T00:00:00Z`));
}

/**
 * A board's detail from its clock and its recent weeks (those whose voting
 * ended in the last ten weeks, or hasn't yet, as the status reads them).
 */
export function boardDetailFrom(
  clock: VenueClock,
  weeks: DetailWeek[],
  now: Date,
): BoardDetail {
  const at = now.getTime();
  const time = (iso: string) => new Date(iso).getTime();
  const timeZone = zoneAt(clock, now);

  const posting = weeks.find(
    (week) => time(week.startsAt) <= at && at < time(week.postingEndsAt),
  );
  const voting = weeks.find(
    (week) => time(week.postingEndsAt) <= at && at < time(week.votingEndsAt),
  );
  const final = openFinal(weeks, timeZone, now);

  return {
    drawingsThisWeek: posting?.liveCount ?? 0,
    votingPeek: voting?.peek ?? [],
    votesCloseOn: voting
      ? weekdayFor(new Date(voting.votingEndsAt), timeZone)
      : null,
    finalMonth: final ? monthName(final.month) : null,
  };
}

/** A board card on the hub. */
export type HubBoard = SidebarBoard & {
  /** Its newest drawings, newest first, up to three. */
  latest: string[];
  /** `null` when its detail couldn't be read. */
  drawingsThisWeek: number | null;
};

/** One "Today" card: something waiting on one board. */
export type TodayCard = {
  kind: Exclude<BoardStatus, null>;
  venueId: string;
  slug: string;
  name: string;
  /** Where its button goes. */
  href: string;
  /** "vote": votes still to cast. */
  votesLeft?: number;
  /** "vote": the weekday voting closes. */
  closesOn?: string | null;
  /** "vote": a few of the drawings being voted on. */
  peek?: string[];
  /** "final": the month it judges. */
  month?: string | null;
  /** "results": the reveals that might still be unseen on this device. */
  revealIds: string[];
};

/** The Today cards' order: the final is rarest and time-boxed. */
const KIND_ORDER: Exclude<BoardStatus, null>[] = [
  "final",
  "vote",
  "draw",
  "results",
];

/** Where each kind of card sends you on the board. */
function hrefFor(kind: TodayCard["kind"], slug: string): string {
  const board = `/b/${encodeURIComponent(slug)}`;
  switch (kind) {
    case "final":
      return `${board}/final`;
    case "vote":
      return `${board}/vote`;
    case "draw":
      return `${board}/draw`;
    // The result plays on the board itself.
    case "results":
      return board;
  }
}

/**
 * The boards as the hub shows them, in the sidebar's order (pinned first,
 * then by last visit), with their latest drawings and this week's count.
 */
export function hubBoards(
  boards: SidebarBoard[],
  latest: Map<string, string[]>,
  details: Map<string, BoardDetail>,
): HubBoard[] {
  return boards.map((board) => ({
    ...board,
    latest: latest.get(board.venueId)?.slice(0, 3) ?? [],
    drawingsThisWeek: details.get(board.venueId)?.drawingsThisWeek ?? null,
  }));
}

/**
 * One card per board with something waiting, in the order final, vote,
 * draw, results, and within a kind in the boards' own order. A board shows
 * only its most urgent status, as its status line does.
 */
export function todayCards(
  boards: SidebarBoard[],
  details: Map<string, BoardDetail>,
): TodayCard[] {
  const cards = boards.flatMap((board): TodayCard[] => {
    if (!board.status) return [];
    const detail = details.get(board.venueId);
    const card: TodayCard = {
      kind: board.status,
      venueId: board.venueId,
      slug: board.slug,
      name: board.name,
      href: hrefFor(board.status, board.slug),
      revealIds: board.status === "results" ? board.revealIds : [],
    };
    if (board.status === "vote") {
      card.votesLeft = board.votesLeft ?? 0;
      card.closesOn = detail?.votesCloseOn ?? null;
      card.peek = detail?.votingPeek.slice(0, 3) ?? [];
    }
    if (board.status === "final") card.month = detail?.finalMonth ?? null;
    return [card];
  });
  // Array sort is stable, so boards keep their order within a kind.
  return cards.sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
  );
}

const NUMBER_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
];

/**
 * The header's line under the greeting: how many things are waiting, in
 * words up to nine and digits after, or that there's nothing to do.
 */
export function waitingLine(count: number, hasBoards: boolean): string {
  if (!hasBoards) return "Open a board with its code, or start your own.";
  if (count <= 0) return "You're all caught up. See you at tomorrow's drawing.";
  if (count === 1) return "One thing is waiting on your boards.";
  const amount = count < NUMBER_WORDS.length ? NUMBER_WORDS[count] : count;
  return `${amount} things are waiting on your boards.`;
}

/** Whether the account can start another board, and the card's line. */
export function startCard(runs: number): { canStart: boolean; line: string } {
  if (runs >= MAX_BOARDS_PER_ACCOUNT) {
    return {
      canStart: false,
      line: `You run ${MAX_BOARDS_PER_ACCOUNT} boards, the most one account can.`,
    };
  }
  return {
    canStart: true,
    line: `For your team, your class or your friends. It's free, and you can run up to ${MAX_BOARDS_PER_ACCOUNT}.`,
  };
}
