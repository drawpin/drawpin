/** Public participation numbers shown on a board. */
export type BoardStats = {
  /** Distinct people who have drawn on the board (all weeks). */
  people: number;
  /** Live drawings the board still holds (all weeks). */
  totalDrawings: number;
  /** Live drawings in the week that is taking posts now. */
  weekDrawings: number;
};

/** A `board_stats` row as the database returns it. */
export type BoardStatsRow = {
  people: number | string;
  total_drawings: number | string;
  week_drawings: number | string;
};

/**
 * Maps a `board_stats` row to the numbers the board shows. The counts are
 * Postgres `bigint`s, which can arrive as strings, so each is made a number.
 *
 * Kept free of server and browser imports: the server reads the stats for the
 * first render, and the board refreshes them itself as drawings come in.
 */
export function toBoardStats(row: BoardStatsRow): BoardStats {
  return {
    people: Number(row.people),
    totalDrawings: Number(row.total_drawings),
    weekDrawings: Number(row.week_drawings),
  };
}

/** Formats a count with its noun, singular or plural. */
function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

/**
 * The one-line summary shown under a board's name, or `null` for a board nobody
 * has drawn on yet (the empty feed says it better than "0 drawings").
 */
export function boardStatsSummary(stats: BoardStats): string | null {
  if (stats.totalDrawings === 0) return null;

  return [
    plural(stats.people, "artist", "artists"),
    plural(stats.totalDrawings, "drawing", "drawings"),
    `${stats.weekDrawings.toLocaleString()} this week`,
  ].join(" · ");
}
