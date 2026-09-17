"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { removeTile } from "./remove-tile";
import { requireOwnedVenue, SupabaseOwnerTileStore } from "./venue";

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
