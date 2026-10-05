/** How long a drawing that didn't win is kept after its week's voting ends. */
export const KEPT_FOR_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** One of a person's own drawings, as their drawings page lists it. */
export type MyDrawing = {
  id: string;
  boardName: string;
  boardSlug: string;
  caption: string | null;
  imageUrl: string;
  postedAt: string;
  /** Won a week or a month, so it's kept for good. */
  isWinner: boolean;
  /** When the clean-up deletes it; `null` for a winner. */
  deletedAfter: string | null;
};

/**
 * When the daily clean-up deletes a drawing that didn't win: 30 days after
 * its week's voting ends (docs/PLAN.md, Data retention).
 */
export function deletionDate(votingEndsAt: string): Date {
  return new Date(new Date(votingEndsAt).getTime() + KEPT_FOR_DAYS * DAY_MS);
}

/**
 * The file name a saved drawing gets, e.g. `drawpin-maple-street-k7m2-2026-10-01.png`:
 * which board, and the day it was posted, so a folder of them sorts by date.
 */
export function downloadName(boardSlug: string, postedAt: string): string {
  return `drawpin-${boardSlug}-${postedAt.slice(0, 10)}.png`;
}

/** A tile, as the download route needs it. */
export type DownloadableTile = {
  imagePath: string;
  boardSlug: string;
  postedAt: string;
};

/** What a download needs from the database, Storage and the image tools. */
export type DownloadDeps = {
  /** The tile, only if this account posted it and it's still on its board. */
  findOwnTile(tileId: string, userId: string): Promise<DownloadableTile | null>;
  readImage(path: string): Promise<Buffer>;
  /** Stored drawings are WebP, which iPhones won't save to Photos. */
  toPng(image: Buffer): Promise<Buffer>;
};

/**
 * One of the signed-in account's own drawings as a PNG file (issue #57).
 *
 * Keyed to the account, never to anything in the request: a tile id that
 * isn't theirs, or is gone, is simply not found.
 */
export async function prepareDownload(
  tileId: string,
  userId: string,
  deps: DownloadDeps,
): Promise<{ file: Buffer; name: string } | null> {
  const tile = await deps.findOwnTile(tileId, userId);
  if (!tile) return null;

  const file = await deps.toPng(await deps.readImage(tile.imagePath));
  return { file, name: downloadName(tile.boardSlug, tile.postedAt) };
}
