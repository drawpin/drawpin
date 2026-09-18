/** Days after voting closes before a week's non-winning tiles are deleted. */
export const RETENTION_DAYS = 30;

/** Days a device can go unused before it's forgotten, if it left nothing behind. */
export const DEVICE_RETENTION_DAYS = 90;

/** A tile due for deletion, and the image that goes with it. */
export type PurgeableTile = { id: string; imagePath: string };

/** What the cleanup job needs from the database and storage. */
export interface CleanupStore {
  /** Weeks whose voting closed before `before` and still hold tiles. */
  listExpiredWeeks(before: Date): Promise<string[]>;
  /** Crowns the week if nobody has looked yet, so its winner is safe. */
  finalizeWeek(weekId: string): Promise<void>;
  /** The week's tiles that aren't a weekly or monthly winner. */
  listPurgeableTiles(weekId: string): Promise<PurgeableTile[]>;
  deleteImage(imagePath: string): Promise<void>;
  deleteTile(tileId: string): Promise<void>;
  /** Posting records older than `before`; the daily limits they held are long gone. */
  deleteOldPostAttempts(before: Date): Promise<number>;
  /** Devices unused since `before` that left no tiles or votes behind. */
  deleteUnusedDevices(before: Date): Promise<number>;
}

export type CleanupDeps = {
  store: CleanupStore;
  now: () => Date;
  logError: (message: string, error: unknown) => void;
};

export type CleanupSummary = {
  weeks: number;
  tilesDeleted: number;
  tilesKept: number;
  postAttemptsDeleted: number;
  devicesDeleted: number;
};

/**
 * The one scheduled job (ADR-003): deletes what the plan says not to keep.
 *
 * Winners are kept forever, so each expired week is crowned before anything is
 * deleted — a venue nobody visited after its voting closed would otherwise
 * have its winner purged before it was ever chosen.
 *
 * The image goes before the row. A row without its image is a tile that fails
 * to load; an image without its row is a public URL nobody can take down, so
 * a failed deletion keeps the row and tries again tomorrow.
 *
 * Safe to run twice, and safe to run after a run that died halfway.
 */
export async function runCleanup(deps: CleanupDeps): Promise<CleanupSummary> {
  const { store } = deps;
  const now = deps.now();
  const before = daysBefore(now, RETENTION_DAYS);

  const summary: CleanupSummary = {
    weeks: 0,
    tilesDeleted: 0,
    tilesKept: 0,
    postAttemptsDeleted: 0,
    devicesDeleted: 0,
  };

  for (const weekId of await store.listExpiredWeeks(before)) {
    summary.weeks += 1;

    try {
      await store.finalizeWeek(weekId);
    } catch (error) {
      // Deleting now could take a winner with it, so leave the week alone.
      deps.logError(`Could not crown week ${weekId}; skipping it`, error);
      continue;
    }

    for (const tile of await store.listPurgeableTiles(weekId)) {
      try {
        await store.deleteImage(tile.imagePath);
      } catch (error) {
        deps.logError(`Could not delete image for tile ${tile.id}`, error);
        summary.tilesKept += 1;
        continue;
      }

      try {
        await store.deleteTile(tile.id);
        summary.tilesDeleted += 1;
      } catch (error) {
        // The image is already gone; tomorrow's run finds the row again and
        // deleting a missing image is not an error.
        deps.logError(`Could not delete tile ${tile.id}`, error);
        summary.tilesKept += 1;
      }
    }
  }

  summary.postAttemptsDeleted = await store.deleteOldPostAttempts(before);
  summary.devicesDeleted = await store.deleteUnusedDevices(
    daysBefore(now, DEVICE_RETENTION_DAYS),
  );

  return summary;
}

function daysBefore(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
