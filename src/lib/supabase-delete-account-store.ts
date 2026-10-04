import type { SupabaseClient } from "@supabase/supabase-js";
import { TILES_BUCKET } from "@/app/b/[slug]/tiles";
import { broadcastToBoard, TILE_REMOVED_EVENT } from "@/lib/realtime/broadcast";
import type { DeleteAccountStore, DeletedTile } from "./delete-account";

/** Rows per page when reading an account's tiles; the API caps a read. */
const PAGE = 1000;

type TileRow = {
  id: string;
  image_path: string;
  status: string;
  weeks: { venue_id: string };
};

/** {@link DeleteAccountStore} backed by Supabase, using the service role. */
export class SupabaseDeleteAccountStore implements DeleteAccountStore {
  constructor(private readonly admin: SupabaseClient) {}

  async listTilesToDelete(userId: string): Promise<DeletedTile[]> {
    const { data: winners, error: winnersError } = await this.admin.rpc(
      "account_winning_tile_ids",
      { p_user_id: userId },
    );
    if (winnersError) {
      throw new Error(`listTilesToDelete: ${winnersError.message}`);
    }
    const kept = new Set<string>(winners ?? []);

    const tiles: DeletedTile[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.admin
        .from("tiles")
        .select("id, image_path, status, weeks!inner(venue_id)")
        .eq("user_id", userId)
        .order("id")
        .range(from, from + PAGE - 1)
        .returns<TileRow[]>();

      if (error) throw new Error(`listTilesToDelete: ${error.message}`);
      for (const row of data) {
        if (kept.has(row.id)) continue;
        tiles.push({
          id: row.id,
          venueId: row.weeks.venue_id,
          imagePath: row.image_path,
          isLive: row.status === "live",
        });
      }
      if (data.length < PAGE) return tiles;
    }
  }

  async deleteImages(paths: string[]): Promise<void> {
    // A file already gone (a removed tile's) isn't an error here.
    const { error } = await this.admin.storage.from(TILES_BUCKET).remove(paths);
    if (error) throw new Error(`deleteImages: ${error.message}`);
  }

  async deleteTiles(userId: string): Promise<void> {
    const { error } = await this.admin.rpc("delete_account_tiles", {
      p_user_id: userId,
    });
    if (error) throw new Error(`deleteTiles: ${error.message}`);
  }

  async announceRemoved(venueId: string, tileId: string): Promise<void> {
    await broadcastToBoard(venueId, TILE_REMOVED_EVENT, { tileId });
  }

  async deleteLogin(userId: string): Promise<void> {
    const { error } = await this.admin.auth.admin.deleteUser(userId);
    if (error) throw new Error(`deleteLogin: ${error.message}`);
  }
}
