import { BlankTileImageError, InvalidTileImageError } from "@/lib/tile-image";
import { localDayFor, type WeekBounds, weekBoundsFor } from "@/lib/venue-time";

export type PostingVenue = { id: string; timezone: string; isPaused: boolean };

export type NewTile = {
  id: string;
  week_id: string;
  device_id: string;
  display_name: string | null;
  name_tag: string | null;
  caption: string | null;
  image_path: string;
};

/** The storage and database operations posting needs. */
export interface TileStore {
  findVenue(slug: string): Promise<PostingVenue | null>;
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
  uploadImage(path: string, image: Buffer): Promise<void>;
  deleteImage(path: string): Promise<void>;
  insertTile(tile: NewTile): Promise<void>;
}

export type PostTileDeps = {
  store: TileStore;
  processImage: (upload: Uint8Array) => Promise<Buffer>;
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
};

export type PostTileFailure =
  | "not-found"
  | "paused"
  | "invalid-image"
  | "blank"
  | "week-closed"
  | "already-posted"
  | "failed";

export type PostTileResult =
  { ok: true; tileId: string } | { ok: false; reason: PostTileFailure };

/**
 * Posts a tile to a venue's current week, enforcing one post per device per
 * venue-local day (docs/PLAN.md, Tiles).
 *
 * The order matters:
 * 1. The image is processed before the daily post is claimed, so a blank or
 *    broken drawing never uses up the day.
 * 2. The claim is a single conditional update, so two posts racing from the
 *    same device can't both win.
 * 3. If saving fails after the claim, the claim is released and any uploaded
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

  const now = deps.now();
  const weekId = await store.ensurePostingWeek(
    venue.id,
    weekBoundsFor(now, venue.timezone),
  );
  if (!weekId) return { ok: false, reason: "week-closed" };

  const localDay = localDayFor(now, venue.timezone);
  const claimed = await store.claimDailyPost(
    venue.id,
    input.deviceId,
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
