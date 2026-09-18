import type { SupabaseClient } from "@supabase/supabase-js";
import type { WeekBounds } from "@/lib/venue-time";
import { TILES_BUCKET } from "../tiles";
import type {
  DailyAttempt,
  NewTile,
  PostingVenue,
  TileStore,
} from "./post-tile";

/**
 * {@link TileStore} backed by Supabase. Needs the service-role client: the
 * tables it writes have no insert policies (docs/ERD.md, Row level security).
 */
export class SupabaseTileStore implements TileStore {
  constructor(private readonly admin: SupabaseClient) {}

  async findVenue(slug: string): Promise<PostingVenue | null> {
    const { data, error } = await this.admin
      .from("venues")
      .select("id, timezone, is_paused")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw new Error(`findVenue: ${error.message}`);
    return data
      ? { id: data.id, timezone: data.timezone, isPaused: data.is_paused }
      : null;
  }

  async getDailyAttempt(
    venueId: string,
    deviceId: string,
    localDay: string,
  ): Promise<DailyAttempt | null> {
    const { data, error } = await this.admin
      .from("post_attempts")
      .select("has_posted, blocked_count")
      .match({ venue_id: venueId, device_id: deviceId, local_day: localDay })
      .maybeSingle();

    if (error) throw new Error(`getDailyAttempt: ${error.message}`);
    return data
      ? { hasPosted: data.has_posted, blockedCount: data.blocked_count }
      : null;
  }

  async countRecentPostsFromIp(ipHash: string, since: Date): Promise<number> {
    // A function rather than a join through the Data API: neither devices nor
    // tiles is readable this way (docs/ERD.md, Data API grants).
    const { data, error } = await this.admin.rpc("count_recent_posts_from_ip", {
      p_ip_hash: ipHash,
      p_since: since.toISOString(),
    });

    if (error) throw new Error(`countRecentPostsFromIp: ${error.message}`);
    return data ?? 0;
  }

  async recordBlockedAttempt(
    venueId: string,
    deviceId: string,
    localDay: string,
  ): Promise<number> {
    // One statement so simultaneous blocked attempts can't both read the same
    // count and overwrite each other.
    const { data, error } = await this.admin.rpc("record_blocked_attempt", {
      p_venue_id: venueId,
      p_device_id: deviceId,
      p_local_day: localDay,
    });

    if (error) throw new Error(`recordBlockedAttempt: ${error.message}`);
    return data as number;
  }

  async ensurePostingWeek(
    venueId: string,
    bounds: WeekBounds,
  ): Promise<string | null> {
    const startsAt = bounds.startsAt.toISOString();

    // Two first posts of the week can race; the unique (venue_id, starts_at)
    // constraint lets both "create" it and then read back the same row.
    const { error: insertError } = await this.admin.from("weeks").upsert(
      {
        venue_id: venueId,
        starts_at: startsAt,
        posting_ends_at: bounds.postingEndsAt.toISOString(),
        voting_ends_at: bounds.votingEndsAt.toISOString(),
      },
      { onConflict: "venue_id,starts_at", ignoreDuplicates: true },
    );
    if (insertError) {
      throw new Error(`ensurePostingWeek: ${insertError.message}`);
    }

    const { data, error } = await this.admin
      .from("weeks")
      .select("id, status")
      .eq("venue_id", venueId)
      .eq("starts_at", startsAt)
      .single();

    if (error) throw new Error(`ensurePostingWeek: ${error.message}`);
    return data.status === "posting" ? data.id : null;
  }

  async claimDailyPost(
    venueId: string,
    deviceId: string,
    localDay: string,
  ): Promise<boolean> {
    const key = { venue_id: venueId, device_id: deviceId, local_day: localDay };

    const { error: insertError } = await this.admin
      .from("post_attempts")
      .upsert(key, {
        onConflict: "venue_id,device_id,local_day",
        ignoreDuplicates: true,
      });
    if (insertError) throw new Error(`claimDailyPost: ${insertError.message}`);

    // Only one request can flip has_posted from false to true, so concurrent
    // posts from the same device can't both succeed.
    const { data, error } = await this.admin
      .from("post_attempts")
      .update({ has_posted: true })
      .match(key)
      .eq("has_posted", false)
      .select("id");

    if (error) throw new Error(`claimDailyPost: ${error.message}`);
    return data.length === 1;
  }

  async releaseDailyPost(
    venueId: string,
    deviceId: string,
    localDay: string,
  ): Promise<void> {
    const { error } = await this.admin
      .from("post_attempts")
      .update({ has_posted: false })
      .match({ venue_id: venueId, device_id: deviceId, local_day: localDay });

    if (error) throw new Error(`releaseDailyPost: ${error.message}`);
  }

  async uploadImage(path: string, image: Buffer): Promise<void> {
    const { error } = await this.admin.storage
      .from(TILES_BUCKET)
      .upload(path, image, {
        contentType: "image/webp",
        // Paths are unique per tile and never overwritten, so the file can be
        // cached for as long as it exists.
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) throw new Error(`uploadImage: ${error.message}`);
  }

  async deleteImage(path: string): Promise<void> {
    const { error } = await this.admin.storage
      .from(TILES_BUCKET)
      .remove([path]);
    if (error) throw new Error(`deleteImage: ${error.message}`);
  }

  async insertTile(tile: NewTile): Promise<void> {
    const { error } = await this.admin.from("tiles").insert(tile);
    if (error) throw new Error(`insertTile: ${error.message}`);
  }
}
