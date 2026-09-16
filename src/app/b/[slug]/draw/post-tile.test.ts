import { beforeEach, describe, expect, it, vi } from "vitest";
import { BlankTileImageError, InvalidTileImageError } from "@/lib/tile-image";
import type { WeekBounds } from "@/lib/venue-time";
import {
  type NewTile,
  type PostTileDeps,
  type PostTileInput,
  postTile,
  type PostingVenue,
  type TileStore,
} from "./post-tile";

/** An in-memory stand-in for Supabase with the same claim semantics. */
class FakeStore implements TileStore {
  venues = new Map<string, PostingVenue>();
  weeks = new Map<string, { id: string; closed: boolean }>();
  claims = new Map<string, boolean>();
  images = new Map<string, Buffer>();
  tiles: NewTile[] = [];
  weekBounds: WeekBounds[] = [];
  failUpload = false;
  failInsert = false;

  async findVenue(slug: string) {
    return this.venues.get(slug) ?? null;
  }

  async ensurePostingWeek(venueId: string, bounds: WeekBounds) {
    this.weekBounds.push(bounds);
    const key = `${venueId}:${bounds.startsAt.toISOString()}`;
    if (!this.weeks.has(key)) {
      this.weeks.set(key, { id: `week-${this.weeks.size + 1}`, closed: false });
    }
    const week = this.weeks.get(key)!;
    return week.closed ? null : week.id;
  }

  async claimDailyPost(venueId: string, deviceId: string, localDay: string) {
    const key = `${venueId}:${deviceId}:${localDay}`;
    if (this.claims.get(key)) return false;
    this.claims.set(key, true);
    return true;
  }

  async releaseDailyPost(venueId: string, deviceId: string, localDay: string) {
    this.claims.set(`${venueId}:${deviceId}:${localDay}`, false);
  }

  async uploadImage(path: string, image: Buffer) {
    if (this.failUpload) throw new Error("storage down");
    this.images.set(path, image);
  }

  async deleteImage(path: string) {
    this.images.delete(path);
  }

  async insertTile(tile: NewTile) {
    if (this.failInsert) throw new Error("insert failed");
    this.tiles.push(tile);
  }
}

const venue: PostingVenue = {
  id: "venue-1",
  timezone: "America/Chicago",
  isPaused: false,
};

let store: FakeStore;
let deps: PostTileDeps;
let clock: Date;

const input = (overrides: Partial<PostTileInput> = {}): PostTileInput => ({
  slug: "cafe-aaaa",
  deviceId: "device-1",
  displayName: "Ahmad",
  caption: "hello",
  image: new Uint8Array([1, 2, 3]),
  ...overrides,
});

beforeEach(() => {
  store = new FakeStore();
  store.venues.set("cafe-aaaa", venue);
  // Wednesday 2026-09-16, 10:00 AM in Chicago.
  clock = new Date("2026-09-16T15:00:00Z");
  let ids = 0;
  deps = {
    store,
    processImage: vi.fn(async () => Buffer.from("webp")),
    nameTag: (deviceId, name) =>
      `${deviceId}/${name}`.length.toString().padStart(4, "0"),
    newId: () => `tile-${++ids}`,
    now: () => clock,
    logError: vi.fn(),
  };
});

describe("postTile", () => {
  it("saves the image and tile in the venue's current week", async () => {
    await expect(postTile(input(), deps)).resolves.toEqual({
      ok: true,
      tileId: "tile-1",
    });

    expect(store.weekBounds[0].startsAt.toISOString()).toBe(
      "2026-09-14T09:00:00.000Z",
    );
    expect([...store.images.keys()]).toEqual(["venue-1/week-1/tile-1.webp"]);
    expect(store.tiles).toEqual([
      {
        id: "tile-1",
        week_id: "week-1",
        device_id: "device-1",
        display_name: "Ahmad",
        name_tag: "0014",
        caption: "hello",
        image_path: "venue-1/week-1/tile-1.webp",
      },
    ]);
  });

  it("posts anonymously with no name tag", async () => {
    await postTile(input({ displayName: null, caption: null }), deps);

    expect(store.tiles[0]).toMatchObject({
      display_name: null,
      name_tag: null,
      caption: null,
    });
  });

  it("allows one post per device per venue-local day", async () => {
    await postTile(input(), deps);

    await expect(postTile(input(), deps)).resolves.toEqual({
      ok: false,
      reason: "already-posted",
    });
    expect(store.tiles).toHaveLength(1);
  });

  it("allows the next post after the 4:00 AM reset", async () => {
    await postTile(input(), deps);

    clock = new Date("2026-09-17T08:59:00Z"); // 3:59 AM: still the same day
    expect((await postTile(input(), deps)).ok).toBe(false);

    clock = new Date("2026-09-17T09:00:00Z"); // 4:00 AM: a new day
    expect((await postTile(input(), deps)).ok).toBe(true);
  });

  it("lets other devices post on the same day", async () => {
    await postTile(input(), deps);
    expect((await postTile(input({ deviceId: "device-2" }), deps)).ok).toBe(
      true,
    );
  });

  it("refuses unknown and paused boards", async () => {
    expect(await postTile(input({ slug: "missing" }), deps)).toEqual({
      ok: false,
      reason: "not-found",
    });

    store.venues.set("cafe-aaaa", { ...venue, isPaused: true });
    expect(await postTile(input(), deps)).toEqual({
      ok: false,
      reason: "paused",
    });
    expect(store.claims.size).toBe(0);
  });

  it.each([
    ["blank", new BlankTileImageError()],
    ["invalid-image", new InvalidTileImageError()],
  ])("rejects a %s drawing without using up the day", async (reason, error) => {
    deps.processImage = vi.fn(async () => {
      throw error;
    });

    expect(await postTile(input(), deps)).toEqual({ ok: false, reason });
    expect(store.claims.size).toBe(0);
  });

  it("refuses posts when the week isn't taking them", async () => {
    await postTile(input(), deps);
    store.weeks.forEach((week) => (week.closed = true));

    expect(await postTile(input({ deviceId: "device-2" }), deps)).toEqual({
      ok: false,
      reason: "week-closed",
    });
  });

  it("gives the post back and deletes the image if saving the tile fails", async () => {
    store.failInsert = true;

    expect(await postTile(input(), deps)).toEqual({
      ok: false,
      reason: "failed",
    });
    expect(store.images.size).toBe(0);

    store.failInsert = false;
    expect((await postTile(input(), deps)).ok).toBe(true);
  });

  it("gives the post back if the upload fails", async () => {
    store.failUpload = true;

    expect(await postTile(input(), deps)).toEqual({
      ok: false,
      reason: "failed",
    });

    store.failUpload = false;
    expect((await postTile(input(), deps)).ok).toBe(true);
  });

  it("still reports the failure if clean-up also fails", async () => {
    store.failInsert = true;
    store.releaseDailyPost = async () => {
      throw new Error("db down");
    };

    expect(await postTile(input(), deps)).toEqual({
      ok: false,
      reason: "failed",
    });
    expect(deps.logError).toHaveBeenCalledTimes(2);
    expect(store.images.size).toBe(0);
  });
});
