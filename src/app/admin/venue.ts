import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { toModerationLevel } from "@/lib/moderation/levels";
import type { ModerationLevel } from "@/lib/moderation/policy";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  clockFromRow,
  VENUE_CLOCK_COLUMNS,
  type VenueClock,
} from "@/lib/venue-time";
import {
  formatAuthor,
  TILES_BUCKET,
  type TileRow,
  toTile,
} from "@/app/b/[slug]/tiles";
import { broadcastToBoard, TILE_REMOVED_EVENT } from "@/lib/realtime/broadcast";
import type { BlockStore } from "./block-account";
import type { CloseBoardStore } from "./close-board";
import type { AdminTile, ReportedTile } from "./drawings";
import type { OwnedTile, OwnerTileStore } from "./remove-tile";

export type OwnerVenue = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  /** The board's zone, and any change to it the owner has scheduled. */
  clock: VenueClock;
  isPaused: boolean;
  /** What posts on the board are checked for (ADR-012). */
  moderationLevel: ModerationLevel;
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
    .select(
      `id, name, slug, is_paused, moderation_level, ${VENUE_CLOCK_COLUMNS}`,
    )
    .eq("owner_id", owner.id)
    .maybeSingle();

  if (error) throw new Error(`Could not load venue: ${error.message}`);
  if (!data) redirect("/setup");

  return {
    id: data.id,
    ownerId: owner.id,
    name: data.name,
    slug: data.slug,
    clock: clockFromRow(data),
    isPaused: data.is_paused,
    moderationLevel: toModerationLevel(data.moderation_level),
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
      canBlock: row.user_id !== null,
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

  async resolveReports(tileId: string): Promise<void> {
    await resolveReports(tileId);
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

type ReportRow = {
  reason: string;
  created_at: string;
  tiles: TileRow & { weeks: { venue_id: string } };
};

/**
 * Tiles on this venue's board with reports nobody has dealt with yet, most
 * reported first. Any week, not just the current one: a drawing can be
 * reported long after the week it was posted in.
 */
export async function listReportedTiles(
  venueId: string,
): Promise<ReportedTile[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("tile_reports")
    .select(
      "reason, created_at, tiles!inner (id, user_id, display_name, name_tag, caption, image_path, created_at, status, weeks!inner (venue_id))",
    )
    .is("resolved_at", null)
    .eq("tiles.status", "live")
    .eq("tiles.weeks.venue_id", venueId)
    .order("created_at", { ascending: false })
    .returns<ReportRow[]>();

  if (error) throw new Error(`listReportedTiles: ${error.message}`);

  const storage = admin.storage.from(TILES_BUCKET);
  const byTile = new Map<string, ReportedTile>();

  for (const row of data) {
    const existing = byTile.get(row.tiles.id);
    if (existing) {
      existing.reportCount += 1;
      if (!existing.reasons.includes(row.reason)) {
        existing.reasons.push(row.reason);
      }
      continue;
    }

    const tile = toTile(
      row.tiles,
      (path) => storage.getPublicUrl(path).data.publicUrl,
    );
    byTile.set(row.tiles.id, {
      id: tile.id,
      author: tile.author,
      canBlock: row.tiles.user_id !== null,
      caption: tile.caption,
      imageUrl: tile.imageUrl,
      reportCount: 1,
      reasons: [row.reason],
    });
  }

  return [...byTile.values()].sort((a, b) => b.reportCount - a.reportCount);
}

/** Marks every open report on a tile as dealt with. */
export async function resolveReports(tileId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("tile_reports")
    .update({ resolved_at: new Date().toISOString() })
    .eq("tile_id", tileId)
    .is("resolved_at", null);

  if (error) throw new Error(`resolveReports: ${error.message}`);
}

/** {@link BlockStore} backed by Supabase, using the service role. */
export class SupabaseBlockStore implements BlockStore {
  constructor(private readonly admin: SupabaseClient) {}

  async findAuthor(
    tileId: string,
  ): Promise<{ venueId: string; userId: string | null } | null> {
    const { data, error } = await this.admin
      .from("tiles")
      .select("user_id, weeks!inner(venue_id)")
      .eq("id", tileId)
      .maybeSingle<{ user_id: string | null; weeks: { venue_id: string } }>();

    if (error) throw new Error(`findAuthor: ${error.message}`);
    return data ? { venueId: data.weeks.venue_id, userId: data.user_id } : null;
  }

  async addBlock(venueId: string, userId: string): Promise<void> {
    const { error } = await this.admin
      .from("venue_blocks")
      .upsert(
        { venue_id: venueId, user_id: userId },
        { onConflict: "venue_id,user_id", ignoreDuplicates: true },
      );

    if (error) throw new Error(`addBlock: ${error.message}`);
  }

  async listLiveTileIds(venueId: string, userId: string): Promise<string[]> {
    const { data, error } = await this.admin
      .from("tiles")
      .select("id, weeks!inner(venue_id)")
      .eq("user_id", userId)
      .eq("status", "live")
      .eq("weeks.venue_id", venueId);

    if (error) throw new Error(`listLiveTileIds: ${error.message}`);
    return data.map((row) => row.id);
  }
}

/** An account the owner has blocked, as the owner screen lists it. */
export type BlockedAccount = {
  userId: string;
  /** How their tiles were signed on this board, e.g. "Ahmad#4821". */
  name: string;
};

/**
 * The accounts blocked from this board, most recently blocked first. Each is
 * named the way its tiles were signed here, since that's how the owner knows
 * them; the username alone isn't unique.
 */
export async function listBlockedAccounts(
  venueId: string,
): Promise<BlockedAccount[]> {
  const admin = createAdminClient();
  const { data: blocks, error } = await admin
    .from("venue_blocks")
    .select("user_id, profiles(username)")
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false })
    .returns<{ user_id: string; profiles: { username: string } | null }[]>();

  if (error) throw new Error(`listBlockedAccounts: ${error.message}`);
  if (blocks.length === 0) return [];

  const { data: tiles, error: tilesError } = await admin
    .from("tiles")
    .select("user_id, display_name, name_tag, weeks!inner(venue_id)")
    .in(
      "user_id",
      blocks.map((block) => block.user_id),
    )
    .eq("weeks.venue_id", venueId)
    .order("created_at", { ascending: false })
    .returns<
      {
        user_id: string;
        display_name: string | null;
        name_tag: string | null;
      }[]
    >();

  if (tilesError) throw new Error(`listBlockedAccounts: ${tilesError.message}`);

  return blocks.map((block) => {
    const latest = tiles.find((tile) => tile.user_id === block.user_id);
    return {
      userId: block.user_id,
      name:
        (latest && formatAuthor(latest.display_name, latest.name_tag)) ??
        block.profiles?.username ??
        "An account",
    };
  });
}

/** Rows per page when reading every tile of a board; the API caps a read. */
const PAGE = 1000;

/** {@link CloseBoardStore} backed by Supabase, using the service role. */
export class SupabaseCloseBoardStore implements CloseBoardStore {
  constructor(private readonly admin: SupabaseClient) {}

  async listImagePaths(venueId: string): Promise<string[]> {
    const paths: string[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.admin
        .from("tiles")
        .select("image_path, weeks!inner(venue_id)")
        .eq("weeks.venue_id", venueId)
        .order("id")
        .range(from, from + PAGE - 1);

      if (error) throw new Error(`listImagePaths: ${error.message}`);
      paths.push(...data.map((row) => row.image_path));
      if (data.length < PAGE) return paths;
    }
  }

  async deleteImages(paths: string[]): Promise<void> {
    // A file already gone (a removed tile's) isn't an error here.
    const { error } = await this.admin.storage.from(TILES_BUCKET).remove(paths);
    if (error) throw new Error(`deleteImages: ${error.message}`);
  }

  async closeVenue(venueId: string): Promise<void> {
    const { error } = await this.admin.rpc("close_venue", {
      p_venue_id: venueId,
    });
    if (error) throw new Error(`closeVenue: ${error.message}`);
  }

  async hasProfile(ownerId: string): Promise<boolean> {
    const { data, error } = await this.admin
      .from("profiles")
      .select("id")
      .eq("id", ownerId)
      .maybeSingle();
    if (error) throw new Error(`hasProfile: ${error.message}`);
    return data !== null;
  }

  async deleteLogin(ownerId: string): Promise<void> {
    const { error } = await this.admin.auth.admin.deleteUser(ownerId);
    if (error) throw new Error(`deleteLogin: ${error.message}`);
  }
}
