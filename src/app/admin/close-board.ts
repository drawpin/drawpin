/** What closing a board needs from Storage, the database and Auth. */
export interface CloseBoardStore {
  /** Every image file the board's tiles point at, in any week or status. */
  listImagePaths(venueId: string): Promise<string[]>;
  /** @throws {Error} If any of them couldn't be deleted. */
  deleteImages(paths: string[]): Promise<void>;
  /** Deletes the board and everything on it, in one transaction. */
  closeVenue(venueId: string): Promise<void>;
  /** Deletes the owner's sign-in. */
  deleteLogin(ownerId: string): Promise<void>;
}

export type CloseBoardResult = "closed" | "name-mismatch";

export type CloseBoardDeps = {
  store: CloseBoardStore;
  logError: (message: string, error: unknown) => void;
};

/** Storage deletes are batched; this keeps each request small. */
const IMAGE_BATCH = 100;

/**
 * Closes an owner's board for good (ADR-009): every drawing and image, every
 * week, vote and report, the Hall of Fame, its links, and the owner's login.
 *
 * The owner types the board's name to confirm, so it can't happen by a stray
 * tap. Images go first: if Storage fails, nothing else has been touched and
 * the owner can simply try again, rather than leaving files behind that no
 * row points to any more. The login goes last and isn't fatal; without its
 * owner row it no longer opens anything.
 */
export async function closeBoard(
  venue: { id: string; name: string; ownerId: string },
  typedName: string,
  deps: CloseBoardDeps,
): Promise<CloseBoardResult> {
  if (!namesMatch(typedName, venue.name)) return "name-mismatch";

  const paths = await deps.store.listImagePaths(venue.id);
  for (let start = 0; start < paths.length; start += IMAGE_BATCH) {
    await deps.store.deleteImages(paths.slice(start, start + IMAGE_BATCH));
  }

  await deps.store.closeVenue(venue.id);

  try {
    await deps.store.deleteLogin(venue.ownerId);
  } catch (error) {
    deps.logError(
      "Closed the board but couldn't delete the owner's login",
      error,
    );
  }

  return "closed";
}

/** Typed confirmation: forgiving about case and spacing, nothing else. */
function namesMatch(typed: string, name: string): boolean {
  const normalize = (value: string) =>
    value.trim().replace(/\s+/g, " ").toLowerCase();
  return normalize(typed) === normalize(name);
}
