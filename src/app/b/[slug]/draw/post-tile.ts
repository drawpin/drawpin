import type {
  ModerationDecision,
  TileContent,
} from "@/lib/moderation/moderate-tile";
import type { ModerationCategory } from "@/lib/moderation/categories";
import type { ModerationLevel } from "@/lib/moderation/policy";
import { ModerationUnavailableError } from "@/lib/moderation/openai";
import { BlankTileImageError, InvalidTileImageError } from "@/lib/tile-image";
import {
  localDayFor,
  type VenueClock,
  type WeekBounds,
  weekBoundsAt,
  zoneAt,
} from "@/lib/venue-time";

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

export type PostingVenue = {
  id: string;
  clock: VenueClock;
  isPaused: boolean;
  /** What the board's posts are checked for (ADR-012). */
  moderationLevel: ModerationLevel;
};

export type NewTile = {
  id: string;
  week_id: string;
  device_id: string;
  /** The poster's account. Only an account can post (ADR-007). */
  user_id: string;
  display_name: string;
  name_tag: string;
  caption: string | null;
  image_path: string;
};

/** A device's moderation record for one venue-local day. */
export type DailyAttempt = { blockedCount: number };

/** The storage and database operations posting needs. */
export interface TileStore {
  findVenue(slug: string): Promise<PostingVenue | null>;
  /** Whether the board's owner has blocked this account (ADR-008). */
  isAccountBlocked(venueId: string, userId: string): Promise<boolean>;
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
  /** Whether the account has already used its post for this day. */
  hasAccountPosted(
    venueId: string,
    userId: string,
    localDay: string,
  ): Promise<boolean>;
  /** Atomically uses the account's post for the day; `false` if already used. */
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
  /** Checks the post against the board's moderation level (ADR-012). */
  moderate: (
    content: TileContent,
    level: ModerationLevel,
  ) => Promise<ModerationDecision>;
  nameTag: (userId: string, displayName: string) => string;
  newId: () => string;
  now: () => Date;
  logError: (message: string, error: unknown) => void;
};

export type PostTileInput = {
  slug: string;
  deviceId: string;
  /** The account's username. */
  displayName: string;
  caption: string | null;
  image: Uint8Array;
  /** The visitor's hashed network, or `null` when no proxy reported one. */
  ipHash: string | null;
  /** The signed-in account. Guests draw for fun and never post (ADR-007). */
  userId: string;
};

export type PostTileFailure =
  | "not-found"
  | "paused"
  | "account-blocked"
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
 * Posts a signed-in customer's tile to a venue's current week, enforcing one
 * post per account per board per venue-local day (docs/PLAN.md, Tiles).
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
 *    same account can't both win. The device plays no part: people sharing a
 *    phone each get their own post (docs/PLAN.md, Tiles).
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
  const localDay = localDayFor(now, zoneAt(venue.clock, now));

  // The checks before anything is processed don't depend on each other, so
  // they run at once (performance pass, 2026-10-06). Their answers are still
  // read in the order below, so the reason someone hears is the same as when
  // they ran one by one.
  const [blocked, attempt, alreadyPosted, recentFromIp] = await Promise.all([
    // Before anything is moderated or counted. The database refuses the tile
    // too; this is so the person hears it before their drawing is processed.
    store.isAccountBlocked(venue.id, input.userId),
    store.getDailyAttempt(venue.id, input.deviceId, localDay),
    store.hasAccountPosted(venue.id, input.userId, localDay),
    input.ipHash
      ? store.countRecentPostsFromIp(
          input.ipHash,
          new Date(now.getTime() - BURST_WINDOW_MS),
        )
      : 0,
  ]);

  if (blocked) return { ok: false, reason: "account-blocked" };
  if (attempt && attempt.blockedCount >= BLOCKED_ATTEMPT_LIMIT) {
    return { ok: false, reason: "locked" };
  }
  // The claim below is what really enforces this; checking here just avoids
  // processing and moderating a drawing that can't be posted anyway.
  if (alreadyPosted) return { ok: false, reason: "already-posted" };
  if (recentFromIp >= BURST_POST_LIMIT) return { ok: false, reason: "burst" };

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

  // Moderation only starts once the checks have passed, so a post that
  // would be refused anyway is never sent to it. Making sure this week
  // exists runs alongside: it's harmless if the drawing is then blocked.
  let decision: ModerationDecision;
  let weekId: string | null;
  try {
    [decision, weekId] = await Promise.all([
      deps.moderate(
        { displayName: input.displayName, caption: input.caption, image },
        venue.moderationLevel,
      ),
      store.ensurePostingWeek(venue.id, weekBoundsAt(now, venue.clock)),
    ]);
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

  if (!weekId) return { ok: false, reason: "week-closed" };

  const claimed = await store.claimAccountPost(
    venue.id,
    input.userId,
    localDay,
  );
  if (!claimed) return { ok: false, reason: "already-posted" };

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
      name_tag: deps.nameTag(input.userId, input.displayName),
      caption: input.caption,
      image_path: imagePath,
    });
  } catch (error) {
    deps.logError("Saving tile failed; releasing the daily post", error);
    await rollback(
      () => store.releaseAccountPost(venue.id, input.userId, localDay),
      deps,
    );
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
