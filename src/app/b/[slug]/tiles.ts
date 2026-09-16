import { z } from "zod";

export const TILES_BUCKET = "tiles";
export const TILE_PAGE_SIZE = 30;

/** A tile as shown on the board. */
export type Tile = {
  id: string;
  /** e.g. `"Ahmad#4821"`, or `null` when posted anonymously. */
  author: string | null;
  caption: string | null;
  imageUrl: string;
  /** Postgres timestamp string, kept as-is so no microseconds are lost. */
  createdAt: string;
};

/** Where the next page of the feed starts: just after this tile. */
export const tileCursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  // guid, not uuid: accepts any id Postgres' uuid type does, including ones
  // without an RFC 4122 version digit.
  id: z.guid(),
});

export type TileCursor = z.infer<typeof tileCursorSchema>;

export type TilePage = { tiles: Tile[]; nextCursor: TileCursor | null };

export type TileRow = {
  id: string;
  display_name: string | null;
  name_tag: string | null;
  caption: string | null;
  image_path: string;
  created_at: string;
};

/**
 * Formats a tile's author the way the board shows it.
 *
 * @example formatAuthor("Ahmad", "4821") // "Ahmad#4821"
 * @returns `null` for an anonymous tile.
 */
export function formatAuthor(
  displayName: string | null,
  nameTag: string | null,
): string | null {
  if (!displayName || !nameTag) return null;
  return `${displayName}#${nameTag}`;
}

/** Maps a `tiles` row to a board tile, resolving its public image URL. */
export function toTile(
  row: TileRow,
  publicUrlFor: (imagePath: string) => string,
): Tile {
  return {
    id: row.id,
    author: formatAuthor(row.display_name, row.name_tag),
    caption: row.caption,
    imageUrl: publicUrlFor(row.image_path),
    createdAt: row.created_at,
  };
}

/**
 * A `tiles` row as Realtime delivers it to the browser. Validated before it's
 * shown, and only live tiles are accepted.
 */
export const liveTileRowSchema = z.object({
  id: z.guid(),
  display_name: z.string().nullable(),
  name_tag: z.string().nullable(),
  caption: z.string().nullable(),
  image_path: z.string().min(1),
  created_at: z.string().min(1),
  status: z.literal("live"),
});

/**
 * Combines tile lists in the order given, keeping the first copy of each tile.
 * Pass newer lists first: realtime arrivals, then the server's page, then
 * tiles already on screen.
 */
export function mergeTiles(...lists: Tile[][]): Tile[] {
  const seen = new Set<string>();
  const merged: Tile[] = [];
  for (const tile of lists.flat()) {
    if (seen.has(tile.id)) continue;
    seen.add(tile.id);
    merged.push(tile);
  }
  return merged;
}

/**
 * Builds a PostgREST `or` filter selecting tiles older than the cursor.
 * Ordering is by `created_at` then `id`, so tiles posted in the same
 * microsecond are neither skipped nor repeated between pages.
 *
 * The cursor must already be validated with {@link tileCursorSchema}: its
 * values are interpolated into the filter string.
 */
export function olderThanCursorFilter(cursor: TileCursor): string {
  const createdAt = `"${cursor.createdAt}"`;
  return `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${cursor.id})`;
}
