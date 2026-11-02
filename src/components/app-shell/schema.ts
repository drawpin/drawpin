import { z } from "zod";
import { boardIdSchema, boardSlugSchema } from "@/lib/my-boards";

/** A board being opened: its slug from the address bar. */
export const visitSchema = z.object({ slug: boardSlugSchema });

/** A board row's pin, unpin or remove. */
export const boardActionSchema = z.object({ venueId: boardIdSchema });

const timestamp = z.iso.datetime({ offset: true });

/**
 * Undoing "Remove from my boards": the row as it was, so it comes back where
 * it stood. Only ever reorders the person's own list.
 */
export const undoRemoveSchema = z.object({
  venueId: boardIdSchema,
  slug: boardSlugSchema,
  lastVisitedAt: timestamp,
  pinnedAt: timestamp.nullable(),
});
