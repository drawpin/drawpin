import type { BoardStats } from "./data";

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

/**
 * The board's participation at a glance: how many people have drawn, how many
 * drawings there are, and how many landed this week.
 *
 * Shown to everyone — the social proof that makes an open board feel worth
 * joining. The numbers come from the server on each load, so they move when the
 * page refreshes rather than tile by tile.
 */
export function BoardStatsLine({ stats }: { stats: BoardStats }) {
  const summary = boardStatsSummary(stats);
  if (!summary) return null;

  return <p className="text-muted-foreground text-sm">{summary}</p>;
}
