import type { Tile } from "../tiles";

/**
 * Why a tile on the voting page can't be picked, or `null` when it can.
 *
 * Your own tile is never pickable (docs/PLAN.md, Weekly cycle). This is for
 * the visitor's benefit: the database refuses a vote on your own tile as
 * well, so a picked tile that slips past this still can't be voted for.
 */
export function notVotableBecause(
  tile: Pick<Tile, "id" | "isOwn" | "isGuest">,
  alreadyVoted: ReadonlySet<string>,
): "Voted" | "Yours" | "Guest" | null {
  if (alreadyVoted.has(tile.id)) return "Voted";
  if (tile.isOwn) return "Yours";
  if (tile.isGuest) return "Guest";
  return null;
}
