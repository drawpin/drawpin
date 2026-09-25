import type {
  ModerationDecision,
  TileContent,
} from "@/lib/moderation/moderate-tile";
import type { ModerationCategory } from "@/lib/moderation/categories";
import { ModerationUnavailableError } from "@/lib/moderation/openai";
import { BlankTileImageError, InvalidTileImageError } from "@/lib/tile-image";
import { localDayFor, type WeekBounds, weekBoundsFor } from "@/lib/venue-time";

/** Blocked attempts in one venue-local day before the device is locked out. */
export const BLOCKED_ATTEMPT_LIMIT = 3;

/**
 * Posts from one network within {@link BURST_WINDOW_MS} before further posts
 * are turned away. Loose enough for a table of friends drawing together,
 * tight enough that a script can't fill the board (docs/PLAN.md, Device
 * limiting: IP is for bursts only, never one post per IP).
 */
export const BURST_POST_LIMIT = 5;

/** The window the burst limit is measured over. */
export const BURST_WINDOW_MS = 10 * 60 * 1000;

export type PostingVenue = { id: string; timezone: string; isPaused: boolean };

export type NewTile = {
  id: string;
  week_id: string;
  device_id: string;
  /** The poster's account, or `null` for a guest tile. */
  user_id: string | null;
  display_name: string | null;
  name_tag: string | null;
  caption: string | null;
  image_path: string;
};

/** A device's posting record for one venue-local day. */
export type DailyAttempt = { hasPosted: boolean; blockedCount: number };

/** The storage and database operations posting needs. */
export interface TileStore {
  findVenue(slug: string): Promise<PostingVenue | null>;
  /** Today's record for this device, or `null` if it hasn't tried yet. */
  getDailyAttempt(
    venueId: string,
    deviceId: string,
    localDay: string,
  ): Promise<DailyAttempt | null>;
  /** Posts made since `since` by devices last seen on this network. */
  countRecentPostsFromIp(ipHash: string, since: Date): Promise<number>;
  /** Counts a moderation-blocked attempt; returns the day's new total. */
  recordBlockedAttempt(
    venueId: string,
    deviceId: string,
    localDay: string,
  ): Promise<number>;
  /** Finds or creates the week with these bounds; `null` if it isn't taking posts. */
  ensurePostingWeek(
    venueId: string,
    bounds: WeekBounds,
  ): Promise<string | null>;
  /** Atomically uses the device's post for the day; `false` if already used. */
  claimDailyPost(
    venueId: string,
    deviceId: string,
    localDay: string,
  ): Promise<boolean>;
  releaseDailyPost(
    venueId: string,
    deviceId: string,
    localDay: string,
  ): Promise<void>;
  /** The same claim for a signed-in account; `false` if already used. */
  claimAccountPost(
    venueId: string,
    userId: string,
    localDay: string,
  ): Promise<boolean>;
  releaseAccountPost(
    venueId: string,
    userId: string,
    localDay: string,
  ): Promise<void>;
  uploadImage(path: string, image: Buffer): Promise<void>;
  deleteImage(path: string): Promise<void>;
  insertTile(tile: NewTile): Promise<void>;
}

export type PostTileDeps = {
  store: TileStore;
  processImage: (upload: Uint8Array) => Promise<Buffer>;
  moderate: (content: TileContent) => Promise<ModerationDecision>;
  nameTag: (deviceId: string, displayName: string) => string;
  newId: () => string;
  now: () => Date;
  logError: (message: string, error: unknown) => void;
};

export type PostTileInput = {
  slug: string;
  deviceId: string;
  displayName: string | null;
  caption: string | null;
  image: Uint8Array;
  /** The visitor's hashed network, or `null` when no proxy reported one. */
  ipHash: string | null;
  /** The signed-in account, or `null` when posting as a guest. */
  userId: string | null;
};

export type PostTileFailure =
  | "not-found"
  | "paused"
  | "invalid-image"
  | "blank"
  | "blocked"
  | "locked"
  | "moderation-unavailable"
  | "burst"
  | "week-closed"
  | "already-posted"
  | "failed";

export type PostTileResult =
  | { ok: true; tileId: string }
  | {
      ok: false;
      reason: "blocked";
      /** What kind of problem, for the poster's message. */
      category: ModerationCategory;
      /** Blocked posts left today before the device is locked out (≥ 1). */
      triesLeft: number;
    }
  | { ok: false; reason: Exclude<PostTileFailure, "blocked"> };

/**
 * Posts a tile to a venue's current week, enforcing one post per device per
 * venue-local day (docs/PLAN.md, Tiles).
 *
 * The order matters:
 * 1. A device already locked out by 3 blocked attempts is turned away before
 *    any work is done.
 * 2. A network posting in bursts is turned away next, again before any heavy
 *    work.
 * 3. The image is processed and moderated before the daily post is claimed, so
 *    a blank, broken, or blocked drawing never uses up the day
 *    (docs/PLAN.md, Moderation).
 * 4. If moderation can't be reached, the post is refused rather than published
 *    unchecked, and the day stays available.
 * 5. The claim is a single conditional update, so two posts racing from the
 *    same device can't both win. A signed-in post claims its account's day as
 *    well, so a second device doesn't buy a second post (docs/PLAN.md, Tiles).
 * 6. If saving fails after the claim, the claim is released and any uploaded
 *    image deleted, so a server error doesn't cost the visitor their post.
 */
export async function postTile(
  input: PostTileInput,
  deps: PostTileDeps,
): Promise<PostTileResult> {
  const { store } = deps;

  const venue = await store.findVenue(input.slug);
  if (!venue) return { ok: false, reason: "not-found" };
  if (venue.isPaused) return { ok: false, reason: "paused" };

  const now = deps.now();
  const localDay = localDayFor(now, venue.timezone);

  const attempt = await store.getDailyAttempt(
    venue.id,
    input.deviceId,
    localDay,
  );
  if (attempt && attempt.blockedCount >= BLOCKED_ATTEMPT_LIMIT) {
    return { ok: false, reason: "locked" };
  }
  // The claim below is what really enforces this; checking here just avoids
  // processing and moderating a drawing that can't be posted anyway.
  if (attempt?.hasPosted) return { ok: false, reason: "already-posted" };

  if (input.ipHash) {
    const recent = await store.countRecentPostsFromIp(
      input.ipHash,
      new Date(now.getTime() - BURST_WINDOW_MS),
    );
    if (recent >= BURST_POST_LIMIT) return { ok: false, reason: "burst" };
  }

  let image: Buffer;
  try {
    image = await deps.processImage(input.image);
  } catch (error) {
    if (error instanceof BlankTileImageError) {
      return { ok: false, reason: "blank" };
    }
    if (error instanceof InvalidTileImageError) {
      return { ok: false, reason: "invalid-image" };
    }
    throw error;
  }

  let decision: ModerationDecision;
  try {
    decision = await deps.moderate({
      displayName: input.displayName,
      caption: input.caption,
      image,
    });
  } catch (error) {
    if (error instanceof ModerationUnavailableError) {
      deps.logError("Moderation unavailable; refusing the post", error);
      return { ok: false, reason: "moderation-unavailable" };
    }
    throw error;
  }

  if (!decision.allowed) {
    deps.logError(`Post blocked by moderation (${decision.reason})`, null);
    const blockedCount = await store.recordBlockedAttempt(
      venue.id,
      input.deviceId,
      localDay,
    );
    if (blockedCount >= BLOCKED_ATTEMPT_LIMIT) {
      return { ok: false, reason: "locked" };
    }
    return {
      ok: false,
      reason: "blocked",
      category: decision.category,
      triesLeft: BLOCKED_ATTEMPT_LIMIT - blockedCount,
    };
  }

  const weekId = await store.ensurePostingWeek(
    venue.id,
    weekBoundsFor(now, venue.timezone),
  );
  if (!weekId) return { ok: false, reason: "week-closed" };

  const claimed = await store.claimDailyPost(
    venue.id,
    input.deviceId,
    localDay,
  );
  if (!claimed) return { ok: false, reason: "already-posted" };

  if (input.userId) {
    const claimedAccount = await store.claimAccountPost(
      venue.id,
      input.userId,
      localDay,
    );
    if (!claimedAccount) {
      await rollback(
        () => store.releaseDailyPost(venue.id, input.deviceId, localDay),
        deps,
      );
      return { ok: false, reason: "already-posted" };
    }
  }

  const tileId = deps.newId();
  const imagePath = `${venue.id}/${weekId}/${tileId}.webp`;
  let uploaded = false;

  try {
    await store.uploadImage(imagePath, image);
    uploaded = true;

    await store.insertTile({
      id: tileId,
      week_id: weekId,
      device_id: input.deviceId,
      user_id: input.userId,
      display_name: input.displayName,
      name_tag: input.displayName
        ? deps.nameTag(input.deviceId, input.displayName)
        : null,
      caption: input.caption,
      image_path: imagePath,
    });
  } catch (error) {
    deps.logError("Saving tile failed; releasing the daily post", error);
    await rollback(
      () => store.releaseDailyPost(venue.id, input.deviceId, localDay),
      deps,
    );
    if (input.userId) {
      const userId = input.userId;
      await rollback(
        () => store.releaseAccountPost(venue.id, userId, localDay),
        deps,
      );
    }
    if (uploaded) await rollback(() => store.deleteImage(imagePath), deps);
    return { ok: false, reason: "failed" };
  }

  return { ok: true, tileId };
}

async function rollback(step: () => Promise<void>, deps: PostTileDeps) {
  try {
    await step();
  } catch (error) {
    // Keep going: the visitor still gets an error, and one failed clean-up
    // step shouldn't stop the other.
    deps.logError("Rolling back a failed tile post also failed", error);
  }
}
