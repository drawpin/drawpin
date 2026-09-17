/**
 * Shared between the server (which sends) and the board (which listens), so
 * the topic and event names can't drift apart. Kept separate from
 * `broadcast.ts`, which is server-only because it uses the service role key.
 */

/** Realtime topic for everything happening on one venue's board. */
export function boardTopic(venueId: string): string {
  return `board:${venueId}`;
}

/** The owner removed a tile; payload is `{ tileId }`. */
export const TILE_REMOVED_EVENT = "tile-removed";
