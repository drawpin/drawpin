/** How many places the vote page's podium has. */
export const PODIUM_PLACES = 3;

/** One vote, with when its tile was posted (for breaking ties). */
export type CastVote = { tileId: string; tileCreatedAt: string };

/** A place on the podium: a tile and its votes so far. */
export type PodiumPlace = { tileId: string; votes: number };

/**
 * Ranks a week's tiles by votes so far, for the vote page's live podium
 * (docs/PLAN.md, Weekly cycle). The order is the one that will pick the
 * winner: most votes first, and a tie goes to the earlier post. Only tiles
 * with at least one vote can place.
 *
 * @example
 * rankPodium([
 *   { tileId: "a", tileCreatedAt: "2026-10-01T10:00:00Z" },
 *   { tileId: "b", tileCreatedAt: "2026-10-01T09:00:00Z" },
 * ]) // [{ tileId: "b", votes: 1 }, { tileId: "a", votes: 1 }]
 */
export function rankPodium(
  votes: CastVote[],
  places: number = PODIUM_PLACES,
): PodiumPlace[] {
  const tallies = new Map<string, { votes: number; createdAt: string }>();
  for (const vote of votes) {
    const tally = tallies.get(vote.tileId);
    if (tally) tally.votes += 1;
    else tallies.set(vote.tileId, { votes: 1, createdAt: vote.tileCreatedAt });
  }

  return [...tallies]
    .sort(
      ([idA, a], [idB, b]) =>
        b.votes - a.votes ||
        Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
        // Same votes, same moment: any steady order will do.
        idA.localeCompare(idB),
    )
    .slice(0, places)
    .map(([tileId, { votes }]) => ({ tileId, votes }));
}
