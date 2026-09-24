"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { moderateVenueName, venueNameSchema } from "@/lib/venue-name";
import { removeTile } from "./remove-tile";
import { renameVenue } from "./rename-venue";
import {
  listReportedTiles,
  requireOwnedVenue,
  resolveReports,
  SupabaseOwnerTileStore,
} from "./venue";

/** Signs the owner out on this device and returns them to the login page. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Could not sign out: ${error.message}`);
  redirect("/login");
}

const pauseSchema = z.object({ paused: z.enum(["true", "false"]) });

/**
 * Pauses or resumes the owner's board. While paused, the board stays readable
 * but refuses new posts (docs/PLAN.md, Owner admin).
 */
export async function setBoardPaused(formData: FormData): Promise<void> {
  const venue = await requireOwnedVenue();
  const parsed = pauseSchema.safeParse({ paused: formData.get("paused") });
  if (!parsed.success) throw new Error("Invalid pause request");

  const { error } = await createAdminClient()
    .from("venues")
    .update({ is_paused: parsed.data.paused === "true" })
    .eq("id", venue.id);

  if (error) throw new Error(`Could not update the board: ${error.message}`);

  revalidatePath("/admin");
}

export type RenameBoardState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "renamed"; name: string };

/**
 * Changes the name shown on the owner's board.
 *
 * Only the display name: the slug, the QR code and the daily join code are
 * untouched, so nothing printed stops working (issue #105).
 *
 * Revalidates `/admin` alone. Every `/b/[slug]` page calls `connection()`, so
 * none of them is in the full route cache, and `getBoard`'s React `cache()` is
 * per-request memoization that can't go stale — the new name is read fresh on
 * the next request. **If a board page ever becomes cacheable, this action has
 * to revalidate it.**
 */
export async function renameBoardAction(
  _previous: RenameBoardState,
  formData: FormData,
): Promise<RenameBoardState> {
  const venue = await requireOwnedVenue();

  const parsed = venueNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  const name = parsed.data;
  const check = await moderateVenueName(name, serverEnv());
  if (check.status === "refused") {
    return { status: "error", message: check.message };
  }

  const result = await renameVenue(venue.name, name, async (next) => {
    const { error } = await createAdminClient()
      .from("venues")
      .update({ name: next })
      .eq("id", venue.id);
    return { error };
  });

  if (result === "renamed") {
    // The only record of what a board used to be called. Kept deliberately:
    // if a board is renamed to something abusive, this is how we find out
    // what it was before (issue #105, "No rate limit and no name-history").
    console.info(`Board renamed: ${venue.id} "${venue.name}" -> "${name}"`);
    revalidatePath("/admin");
  }

  return { status: "renamed", name };
}

const removeSchema = z.object({ tileId: z.guid() });

export type RemoveTileState =
  { status: "idle" } | { status: "error"; message: string };

/**
 * Removes a tile from the owner's board: the moderation backstop for anything
 * automatic checks miss.
 */
export async function removeTileAction(
  _previous: RemoveTileState,
  formData: FormData,
): Promise<RemoveTileState> {
  const venue = await requireOwnedVenue();
  const parsed = removeSchema.safeParse({ tileId: formData.get("tileId") });
  if (!parsed.success) {
    return { status: "error", message: "We couldn't remove that tile." };
  }

  const admin = createAdminClient();
  const result = await removeTile(venue.id, parsed.data.tileId, {
    store: new SupabaseOwnerTileStore(admin),
    logError: console.error,
  });

  if (result !== "removed") {
    console.error(`removeTile refused: ${result}`);
    return { status: "error", message: "We couldn't remove that tile." };
  }

  revalidatePath("/admin");
  return { status: "idle" };
}

/** Dismisses the reports against a tile, leaving the tile where it is. */
export async function dismissReportsAction(
  _previous: RemoveTileState,
  formData: FormData,
): Promise<RemoveTileState> {
  const venue = await requireOwnedVenue();
  const parsed = removeSchema.safeParse({ tileId: formData.get("tileId") });
  if (!parsed.success) {
    return { status: "error", message: "We couldn't dismiss those reports." };
  }

  // Only the owner's own board: a tile elsewhere isn't theirs to dismiss.
  const reported = await listReportedTiles(venue.id);
  if (!reported.some((tile) => tile.id === parsed.data.tileId)) {
    return { status: "error", message: "We couldn't dismiss those reports." };
  }

  await resolveReports(parsed.data.tileId);
  revalidatePath("/admin");
  return { status: "idle" };
}
