import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TILES_BUCKET, type TileRow, toTile } from "@/app/b/[slug]/tiles";
import { broadcastToBoard, TILE_REMOVED_EVENT } from "@/lib/realtime/broadcast";
import type { AdminTile } from "./board-tiles";
import type { OwnedTile, OwnerTileStore } from "./remove-tile";

export type OwnerVenue = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  isPaused: boolean;
};

/**
 * The signed-in owner's venue. Redirects to `/login` when nobody is signed in
 * and to `/setup` when they haven't created a board yet, so callers can assume
 * both.
 */
export async function requireOwnedVenue(): Promise<OwnerVenue> {
  const owner = await requireOwner();

  const { data, error } = await createAdminClient()
    .from("venues")
    .select("id, name, slug, timezone, is_paused")
    .eq("owner_id", owner.id)
    .maybeSingle();

  if (error) throw new Error(`Could not load venue: ${error.message}`);
  if (!data) redirect("/setup");

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    timezone: data.timezone,
    isPaused: data.is_paused,
  };
}

/** How many of the board's newest tiles the owner screen shows. */
const ADMIN_TILE_LIMIT = 60;

/**
 * The live tiles on the venue's current board, newest first, for the owner's
 * Remove controls. Reads with the service role: `post_attempts`-style privacy
 * doesn't apply here, but the owner needs tiles regardless of the public
 * "live tiles" policy.
 */
export async function listBoardTiles(venueId: string): Promise<AdminTile[]> {
  const admin = createAdminClient();

  // The week taking posts right now, the same one the board shows.
  const moment = new Date().toISOString();
  const { data: week, error: weekError } = await admin
    .from("weeks")
    .select("id")
    .eq("venue_id", venueId)
    .lte("starts_at", moment)
    .gt("posting_ends_at", moment)
    .maybeSingle();

  if (weekError) throw new Error(`listBoardTiles: ${weekError.message}`);
  if (!week) return [];

  const { data, error } = await admin
    .from("tiles")
    .select(
      "id, user_id, display_name, name_tag, caption, image_path, created_at",
    )
    .eq("week_id", week.id)
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(ADMIN_TILE_LIMIT)
    .returns<TileRow[]>();

  if (error) throw new Error(`listBoardTiles: ${error.message}`);

  const storage = admin.storage.from(TILES_BUCKET);
  return data.map((row) => {
    const tile = toTile(
      row,
      (path) => storage.getPublicUrl(path).data.publicUrl,
    );
    return {
      id: tile.id,
      author: tile.author,
      caption: tile.caption,
      imageUrl: tile.imageUrl,
    };
  });
}

/** {@link OwnerTileStore} backed by Supabase, using the service role. */
export class SupabaseOwnerTileStore implements OwnerTileStore {
  constructor(private readonly admin: SupabaseClient) {}

  async findTile(tileId: string): Promise<OwnedTile | null> {
    const { data, error } = await this.admin
      .from("tiles")
      .select("id, week_id, image_path, weeks!inner(venue_id)")
      .eq("id", tileId)
      .maybeSingle<{
        id: string;
        week_id: string;
        image_path: string;
        weeks: { venue_id: string };
      }>();

    if (error) throw new Error(`findTile: ${error.message}`);
    return data
      ? {
          id: data.id,
          weekId: data.week_id,
          venueId: data.weeks.venue_id,
          imagePath: data.image_path,
        }
      : null;
  }

  async markRemoved(tileId: string): Promise<void> {
    const { error } = await this.admin
      .from("tiles")
      .update({ status: "removed" })
      .eq("id", tileId);

    if (error) throw new Error(`markRemoved: ${error.message}`);
  }

  async refinalizeWeek(weekId: string): Promise<void> {
    // A no-op while the week is still being voted on.
    const { error } = await this.admin.rpc("finalize_week_winner", {
      p_week_id: weekId,
    });

    if (error) throw new Error(`refinalizeWeek: ${error.message}`);
  }

  async deleteImage(imagePath: string): Promise<void> {
    const { error } = await this.admin.storage
      .from(TILES_BUCKET)
      .remove([imagePath]);

    if (error) throw new Error(`deleteImage: ${error.message}`);
  }

  async announceRemoved(venueId: string, tileId: string): Promise<void> {
    await broadcastToBoard(venueId, TILE_REMOVED_EVENT, { tileId });
  }
}
