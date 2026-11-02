/** What closing a board needs from Storage, the database and Auth. */
export interface CloseBoardStore {
  /** Every image file the board's tiles point at, in any week or status. */
  listImagePaths(venueId: string): Promise<string[]>;
  /** @throws {Error} If any of them couldn't be deleted. */
  deleteImages(paths: string[]): Promise<void>;
  /**
   * Deletes the board and everything on it, in one transaction, and the
   * owner row with the account's last board (ADR-016).
   */
  closeVenue(venueId: string): Promise<void>;
  /** How many boards the account still runs. */
  countOwnedBoards(ownerId: string): Promise<number>;
  /** Whether the owner's account also draws (has a profile, ADR-013). */
  hasProfile(ownerId: string): Promise<boolean>;
  /** Deletes the owner's sign-in. */
  deleteLogin(ownerId: string): Promise<void>;
}

/**
 * - `closed`: the board is gone; the account and its sign-in stay.
 * - `closed-account`: it was the last board of an account that doesn't
 *   draw, so its sign-in was deleted too.
 * - `name-mismatch`: nothing happened.
 */
export type CloseBoardResult = "closed" | "closed-account" | "name-mismatch";

export type CloseBoardDeps = {
  store: CloseBoardStore;
  logError: (message: string, error: unknown) => void;
};

/** Storage deletes are batched; this keeps each request small. */
const IMAGE_BATCH = 100;

/**
 * Closes one of an owner's boards for good (ADR-009): every drawing and
 * image, every week, vote and report, the Hall of Fame and its links. The
 * account's other boards are untouched (ADR-016).
 *
 * The owner's sign-in goes too only when nothing else needs it: this was the
 * account's last board, and the account doesn't draw (ADR-013). Deleting it
 * otherwise would cascade through the owner row to every other board, or
 * take the person's drawings and votes with it.
 *
 * The owner types the board's name to confirm, so it can't happen by a stray
 * tap. Images go first: if Storage fails, nothing else has been touched and
 * the owner can simply try again, rather than leaving files behind that no
 * row points to any more. The login goes last and isn't fatal; without an
 * owner row or a profile it no longer opens anything.
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
    // Counted after the close, so a board started meanwhile in another tab
    // still keeps the sign-in.
    if ((await deps.store.countOwnedBoards(venue.ownerId)) > 0) return "closed";
    if (await deps.store.hasProfile(venue.ownerId)) return "closed";
    await deps.store.deleteLogin(venue.ownerId);
    return "closed-account";
  } catch (error) {
    // Keeping the sign-in is the safe side: the person can still close
    // anything that's left, or delete the account themselves.
    deps.logError(
      "Closed the board but couldn't check or delete the owner's login",
      error,
    );
    return "closed";
  }
}

/** Typed confirmation: forgiving about case and spacing, nothing else. */
function namesMatch(typed: string, name: string): boolean {
  const normalize = (value: string) =>
    value.trim().replace(/\s+/g, " ").toLowerCase();
  return normalize(typed) === normalize(name);
}
