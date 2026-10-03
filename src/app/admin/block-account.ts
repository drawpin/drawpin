import type { RemoveTileResult } from "./remove-tile";

/** What blocking an account needs from the database. */
export interface BlockStore {
  /** The board a tile is on and the account that posted it. */
  findAuthor(
    tileId: string,
  ): Promise<{ venueId: string; userId: string | null } | null>;
  /** Records the block; blocking an account twice is the same as once. */
  addBlock(venueId: string, userId: string): Promise<void>;
  /** The account's tiles still showing on this board, in any week. */
  listLiveTileIds(venueId: string, userId: string): Promise<string[]>;
}

export type BlockAuthorResult =
  | { status: "blocked"; removed: number; failed: number }
  | { status: "not-found" | "not-yours" | "guest" };

export type BlockAuthorDeps = {
  store: BlockStore;
  /** Removes one tile the way the owner's Remove button does. */
  removeTile: (tileId: string) => Promise<RemoveTileResult>;
  logError: (message: string, error: unknown) => void;
};

/**
 * Blocks the account that posted a tile from the owner's board, and removes
 * every tile it has showing there (ADR-008).
 *
 * The owner picks a drawing rather than an account, so they can only block
 * someone who has posted on their own board. The block is recorded first, so
 * nothing new arrives while the old tiles come down. Each tile goes the same
 * way a single removal does, re-crowning any week it had won; one that fails
 * is logged and counted rather than stopping the rest.
 *
 * @param venueId - The signed-in owner's venue.
 */
export async function blockAuthor(
  venueId: string,
  tileId: string,
  deps: BlockAuthorDeps,
): Promise<BlockAuthorResult> {
  const author = await deps.store.findAuthor(tileId);
  if (!author) return { status: "not-found" };
  if (author.venueId !== venueId) return { status: "not-yours" };
  if (!author.userId) return { status: "guest" };

  await deps.store.addBlock(venueId, author.userId);

  let removed = 0;
  let failed = 0;
  for (const id of await deps.store.listLiveTileIds(venueId, author.userId)) {
    try {
      if ((await deps.removeTile(id)) === "removed") removed += 1;
      else failed += 1;
    } catch (error) {
      deps.logError(
        `Blocked the account but couldn't remove tile ${id}`,
        error,
      );
      failed += 1;
    }
  }

  return { status: "blocked", removed, failed };
}
