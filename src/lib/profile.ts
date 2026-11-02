import { VOTES_PER_WEEK } from "@/app/b/[slug]/vote/cast-votes";
import type { MyDrawing } from "./my-drawings";

/**
 * The private profile hub's numbers and lists (`/me`, docs/design/profiles.md
 * section 4), as pure functions over rows the store reads. Nothing here
 * touches the database.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** The four numbers at the top of the profile. */
export type ProfileStats = {
  drawings: number;
  weeklyWins: number;
  superWins: number;
  boards: number;
};

/**
 * Counts what the account has done.
 *
 * @param tileBoardIds - The board of every tile the account has posted that
 * still exists, one entry per tile.
 * @param weeklyWins - Weeks the account's tiles won.
 * @param superWins - Monthly finals the account's tiles won.
 */
export function computeStats(
  tileBoardIds: string[],
  weeklyWins: number,
  superWins: number,
): ProfileStats {
  return {
    drawings: tileBoardIds.length,
    weeklyWins,
    superWins,
    boards: new Set(tileBoardIds).size,
  };
}

/** "October 2026", for "Drawing since". */
export function formatMemberSince(joinedAt: string): string {
  return new Date(joinedAt).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "5 October", in the given time zone. */
export function formatDayMonth(iso: string, timeZone = "UTC"): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone,
  });
}

// Drawings -------------------------------------------------------------------

/** A drawing as the profile shows it: with which kind of win it carries. */
export type ProfileDrawing = MyDrawing & {
  win: "weekly" | "super" | null;
};

/** One board's drawings. */
export type DrawingGroup = {
  boardSlug: string;
  boardName: string;
  drawings: ProfileDrawing[];
};

/**
 * Groups drawings by board. Boards come in the order of their newest
 * drawing, and drawings keep the order they were given (newest first), so
 * the board you drew on most recently is on top.
 *
 * @param superTileIds - Tiles that won a monthly final; any other winner
 * won a week.
 */
export function groupDrawings(
  drawings: MyDrawing[],
  superTileIds: ReadonlySet<string>,
): DrawingGroup[] {
  const groups = new Map<string, DrawingGroup>();
  for (const drawing of drawings) {
    let group = groups.get(drawing.boardSlug);
    if (!group) {
      group = {
        boardSlug: drawing.boardSlug,
        boardName: drawing.boardName,
        drawings: [],
      };
      groups.set(drawing.boardSlug, group);
    }
    group.drawings.push({
      ...drawing,
      win: !drawing.isWinner
        ? null
        : superTileIds.has(drawing.id)
          ? "super"
          : "weekly",
    });
  }
  return [...groups.values()];
}

// Trophies -------------------------------------------------------------------

/** A weekly win, as the store reads it. */
export type WeeklyWinRow = {
  tileId: string;
  imageUrl: string;
  boardName: string;
  boardSlug: string;
  /** When the winning week began. */
  weekStartsAt: string;
  /** The board's time zone, which decides the week's date. */
  timezone: string;
};

/** A monthly win, as the store reads it. */
export type SuperWinRow = {
  tileId: string;
  imageUrl: string;
  boardName: string;
  boardSlug: string;
  /** First day of the month, `YYYY-MM-DD`. */
  month: string;
  /** When the final closed; orders trophies against weekly ones. */
  endsAt: string;
};

/** One drawing on the trophy shelf. */
export type Trophy = {
  id: string;
  kind: "weekly" | "super";
  /** "Week of 5 October" or "October's super winner". */
  label: string;
  boardName: string;
  boardSlug: string;
  imageUrl: string;
  /** When it was won, for ordering. */
  wonAt: string;
};

/** "October", from a `YYYY-MM-DD` month start. */
function monthName(month: string): string {
  return new Date(`${month.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString(
    "en-GB",
    { month: "long", timeZone: "UTC" },
  );
}

/** Weekly and super wins on one shelf, newest first. */
export function buildTrophies(
  weekly: WeeklyWinRow[],
  supers: SuperWinRow[],
): Trophy[] {
  const trophies: Trophy[] = [
    ...weekly.map((row): Trophy => ({
      id: `week-${row.tileId}`,
      kind: "weekly",
      label: `Week of ${formatDayMonth(row.weekStartsAt, row.timezone)}`,
      boardName: row.boardName,
      boardSlug: row.boardSlug,
      imageUrl: row.imageUrl,
      wonAt: row.weekStartsAt,
    })),
    ...supers.map((row): Trophy => ({
      id: `super-${row.tileId}`,
      kind: "super",
      label: `${monthName(row.month)}'s super winner`,
      boardName: row.boardName,
      boardSlug: row.boardSlug,
      imageUrl: row.imageUrl,
      wonAt: row.endsAt,
    })),
  ];
  return trophies.sort((a, b) => b.wonAt.localeCompare(a.wonAt));
}

// Votes ----------------------------------------------------------------------

/** One of the account's votes, with its week, as the store reads it. */
export type VoteRow = {
  tileId: string;
  weekId: string;
  boardName: string;
  boardSlug: string;
  timezone: string;
  /** When the week's voting opened (its posting ended). */
  votingStartsAt: string;
  votingEndsAt: string;
};

/** A line on "Your votes". */
export type VoteSummary = {
  boardName: string;
  boardSlug: string;
  cast: number;
  of: number;
  note: string;
};

/**
 * "Your votes": a line per board where the account is voting right now, and
 * for a board whose voting closed in the last week, one if a tile they voted
 * for won.
 *
 * Light on purpose: a board where they haven't voted yet isn't listed (the
 * board's own page and the hub's Today card cover that).
 *
 * @param wonTileIds - Which of the voted-for tiles won their week.
 */
export function buildVoteSummaries(
  votes: VoteRow[],
  wonTileIds: ReadonlySet<string>,
  now: Date,
): VoteSummary[] {
  const open = new Map<string, VoteSummary>();
  const won = new Map<string, VoteSummary>();

  for (const vote of votes) {
    const starts = new Date(vote.votingStartsAt).getTime();
    const ends = new Date(vote.votingEndsAt).getTime();
    const time = now.getTime();

    if (starts <= time && time < ends) {
      const line = open.get(vote.weekId) ?? {
        boardName: vote.boardName,
        boardSlug: vote.boardSlug,
        cast: 0,
        of: VOTES_PER_WEEK,
        note: "",
      };
      line.cast += 1;
      line.note =
        line.cast >= VOTES_PER_WEEK
          ? "All your votes are in"
          : `Voting closes ${new Date(ends).toLocaleDateString("en-GB", {
              weekday: "long",
              timeZone: vote.timezone,
            })}`;
      open.set(vote.weekId, line);
    } else if (
      ends <= time &&
      time - ends < 7 * DAY_MS &&
      wonTileIds.has(vote.tileId)
    ) {
      won.set(vote.weekId, {
        boardName: vote.boardName,
        boardSlug: vote.boardSlug,
        cast: votes.filter((other) => other.weekId === vote.weekId).length,
        of: VOTES_PER_WEEK,
        note: "Your pick won last week",
      });
    }
  }

  const lines = [...open.values()];
  const seen = new Set(lines.map((line) => line.boardSlug));
  for (const line of won.values()) {
    if (!seen.has(line.boardSlug)) lines.push(line);
  }
  return lines;
}
