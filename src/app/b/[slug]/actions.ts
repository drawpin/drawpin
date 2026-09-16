"use server";

import { z } from "zod";
import { listLiveTiles } from "./data";
import { type TilePage, tileCursorSchema } from "./tiles";

const loadMoreSchema = z.object({
  weekId: z.guid(),
  cursor: tileCursorSchema,
});

export type LoadMoreResult =
  ({ ok: true } & TilePage) | { ok: false; message: string };

/**
 * Loads the next page of a week's live tiles for the board's "Load more"
 * button. Only returns tiles that are already publicly readable.
 */
export async function loadMoreTiles(input: unknown): Promise<LoadMoreResult> {
  const parsed = loadMoreSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Couldn't load more tiles." };
  }

  try {
    const page = await listLiveTiles(parsed.data.weekId, parsed.data.cursor);
    return { ok: true, ...page };
  } catch (error) {
    console.error("loadMoreTiles failed", error);
    return { ok: false, message: "Couldn't load more tiles. Try again." };
  }
}
