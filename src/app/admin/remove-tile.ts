/** A tile as the owner screen needs it for a removal check. */
export type OwnedTile = {
  id: string;
  weekId: string;
  venueId: string;
  imagePath: string;
};

/** What removing a tile needs from the database and storage. */
export interface OwnerTileStore {
  findTile(tileId: string): Promise<OwnedTile | null>;
  markRemoved(tileId: string): Promise<void>;
  deleteImage(imagePath: string): Promise<void>;
  /** Re-crowns the tile's week, in case the tile was its winner. */
  refinalizeWeek(weekId: string): Promise<void>;
  /** Settles any reports against the tile; the owner has now acted. */
  resolveReports(tileId: string): Promise<void>;
  /** Tells open boards to drop the tile; failures here aren't fatal. */
  announceRemoved(venueId: string, tileId: string): Promise<void>;
}

export type RemoveTileResult = "removed" | "not-found" | "not-yours";

export type RemoveTileDeps = {
  store: OwnerTileStore;
  logError: (message: string, error: unknown) => void;
};

/**
 * Removes a tile from an owner's board: hides it, then deletes its image so
 * the public URL stops working. This is the backstop for what automatic
 * moderation can't catch (docs/PLAN.md, Moderation).
 *
 * The row is kept rather than deleted, so the Hall of Fame's foreign key and
 * the votes cast on it still have something to point at; it just stops being
 * shown.
 *
 * Removing a tile that had won its week takes the win with it: the week is
 * re-crowned from what's left, because leaving a removed drawing enshrined
 * would contradict the removal. A week with nothing else voted for ends up
 * with no winner at all.
 *
 * @param venueId - The signed-in owner's venue. A tile on any other board is
 * `"not-yours"`, so one owner can't remove another's tile.
 */
export async function removeTile(
  venueId: string,
  tileId: string,
  deps: RemoveTileDeps,
): Promise<RemoveTileResult> {
  const tile = await deps.store.findTile(tileId);
  if (!tile) return "not-found";
  if (tile.venueId !== venueId) return "not-yours";

  // Hide it first: if deleting the image fails, the tile is still gone from
  // the board, and the leftover file is cleaned up by the 30-day job.
  await deps.store.markRemoved(tileId);

  try {
    await deps.store.deleteImage(tile.imagePath);
  } catch (error) {
    deps.logError("Removed the tile but couldn't delete its image", error);
  }

  try {
    await deps.store.resolveReports(tileId);
  } catch (error) {
    // The tile is gone from the board either way; a stale report just leaves
    // the owner something to dismiss.
    deps.logError("Removed the tile but couldn't settle its reports", error);
  }

  try {
    await deps.store.refinalizeWeek(tile.weekId);
  } catch (error) {
    // The next view of the Hall of Fame finalizes it anyway (ADR-003).
    deps.logError("Removed the tile but couldn't re-crown its week", error);
  }

  try {
    await deps.store.announceRemoved(venueId, tileId);
  } catch (error) {
    // Open boards still drop it on their next refresh.
    deps.logError("Removed the tile but couldn't tell open boards", error);
  }

  return "removed";
}
