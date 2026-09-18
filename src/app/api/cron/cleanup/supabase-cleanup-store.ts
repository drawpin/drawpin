import type { SupabaseClient } from "@supabase/supabase-js";
import { TILES_BUCKET } from "@/app/b/[slug]/tiles";
import type { CleanupStore, PurgeableTile } from "./purge";

/**
 * {@link CleanupStore} backed by Supabase. Needs the service-role client: it
 * deletes from tables nobody else may even read.
 */
export class SupabaseCleanupStore implements CleanupStore {
  constructor(private readonly admin: SupabaseClient) {}

  async listExpiredWeeks(before: Date): Promise<string[]> {
    const { data, error } = await this.admin.rpc("list_expired_weeks", {
      p_before: before.toISOString(),
    });

    if (error) throw new Error(`listExpiredWeeks: ${error.message}`);
    return ((data ?? []) as { week_id: string }[]).map((row) => row.week_id);
  }

  async finalizeWeek(weekId: string): Promise<void> {
    const { error } = await this.admin.rpc("finalize_week_winner", {
      p_week_id: weekId,
    });

    if (error) throw new Error(`finalizeWeek: ${error.message}`);
  }

  async listPurgeableTiles(weekId: string): Promise<PurgeableTile[]> {
    const { data, error } = await this.admin.rpc("list_purgeable_tiles", {
      p_week_id: weekId,
    });

    if (error) throw new Error(`listPurgeableTiles: ${error.message}`);
    return ((data ?? []) as { tile_id: string; image_path: string }[]).map(
      (row) => ({ id: row.tile_id, imagePath: row.image_path }),
    );
  }

  async deleteImage(imagePath: string): Promise<void> {
    const { error } = await this.admin.storage
      .from(TILES_BUCKET)
      .remove([imagePath]);

    if (error) throw new Error(`deleteImage: ${error.message}`);
  }

  async deleteTile(tileId: string): Promise<void> {
    const { error } = await this.admin.from("tiles").delete().eq("id", tileId);

    if (error) throw new Error(`deleteTile: ${error.message}`);
  }

  async deleteOldPostAttempts(before: Date): Promise<number> {
    const { data, error } = await this.admin
      .from("post_attempts")
      .delete()
      .lt("local_day", before.toISOString().slice(0, 10))
      .select("id");

    if (error) throw new Error(`deleteOldPostAttempts: ${error.message}`);
    return data?.length ?? 0;
  }

  async deleteUnusedDevices(before: Date): Promise<number> {
    const { data, error } = await this.admin.rpc("delete_unused_devices", {
      p_before: before.toISOString(),
    });

    if (error) throw new Error(`deleteUnusedDevices: ${error.message}`);
    return data ?? 0;
  }
}
