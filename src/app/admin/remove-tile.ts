/** A tile as the owner screen needs it for a removal check. */
export type OwnedTile = { id: string; venueId: string; imagePath: string };

/** What removing a tile needs from the database and storage. */
export interface OwnerTileStore {
  findTile(tileId: string): Promise<OwnedTile | null>;
  markRemoved(tileId: string): Promise<void>;
  deleteImage(imagePath: string): Promise<void>;
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
 * The row is kept rather than deleted, so a tile that already won a week
 * still satisfies the Hall of Fame's foreign key; it just stops being shown.
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
    await deps.store.announceRemoved(venueId, tileId);
  } catch (error) {
    // Open boards still drop it on their next refresh.
    deps.logError("Removed the tile but couldn't tell open boards", error);
  }

  return "removed";
}
