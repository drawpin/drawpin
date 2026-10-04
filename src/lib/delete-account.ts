/** A tile an account deletion takes away. */
export type DeletedTile = {
  id: string;
  venueId: string;
  imagePath: string;
  /** Still on a board, so open boards are told it's gone. */
  isLive: boolean;
};

/** What deleting an account needs from Storage, the database and Auth. */
export interface DeleteAccountStore {
  /** The account's tiles, except winners, which stay (unnamed). */
  listTilesToDelete(userId: string): Promise<DeletedTile[]>;
  /** @throws {Error} If any of them couldn't be deleted. */
  deleteImages(paths: string[]): Promise<void>;
  /** Deletes those tiles and takes the name off the winners. */
  deleteTiles(userId: string): Promise<void>;
  /** Tells a board's open pages to drop a tile. */
  announceRemoved(venueId: string, tileId: string): Promise<void>;
  /** Deletes the sign-in; the profile, votes and reports cascade. */
  deleteLogin(userId: string): Promise<void>;
}

export type DeleteAccountDeps = {
  store: DeleteAccountStore;
  logError: (message: string, error: unknown) => void;
};

/** Storage deletes are batched; this keeps each request small. */
const IMAGE_BATCH = 100;

/**
 * Deletes a customer's DrawPin account (docs/PLAN.md, Accounts). Their
 * Google account is untouched; signing in again starts a new, empty one.
 *
 * Every drawing they posted goes, image and all, except a weekly or monthly
 * winner, which stays in that board's Hall of Fame without their name. Their
 * votes, reports and the rest go with the profile.
 *
 * Images go first, so a Storage failure leaves everything else for another
 * try. Each step can be repeated, so a failure part-way through is fixed by
 * trying again.
 *
 * @throws {Error} If a step fails; the account is then still there.
 */
export async function deleteAccount(
  userId: string,
  deps: DeleteAccountDeps,
): Promise<void> {
  const tiles = await deps.store.listTilesToDelete(userId);

  const paths = tiles.map((tile) => tile.imagePath);
  for (let start = 0; start < paths.length; start += IMAGE_BATCH) {
    await deps.store.deleteImages(paths.slice(start, start + IMAGE_BATCH));
  }

  await deps.store.deleteTiles(userId);

  for (const tile of tiles.filter((each) => each.isLive)) {
    try {
      await deps.store.announceRemoved(tile.venueId, tile.id);
    } catch (error) {
      // Open boards drop it on their next refresh anyway.
      deps.logError("Deleted a tile but couldn't tell open boards", error);
    }
  }

  await deps.store.deleteLogin(userId);
}
