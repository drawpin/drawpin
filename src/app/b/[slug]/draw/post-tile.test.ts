import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModerationUnavailableError } from "@/lib/moderation/openai";
import { BlankTileImageError, InvalidTileImageError } from "@/lib/tile-image";
import type { WeekBounds } from "@/lib/venue-time";
import {
  BURST_POST_LIMIT,
  BURST_WINDOW_MS,
  type NewTile,
  type PostTileDeps,
  type PostTileInput,
  postTile,
  type PostTileResult,
  type PostingVenue,
  type TileStore,
} from "./post-tile";

/** An in-memory stand-in for Supabase with the same claim semantics. */
class FakeStore implements TileStore {
  venues = new Map<string, PostingVenue>();
  weeks = new Map<string, { id: string; closed: boolean }>();
  claims = new Map<string, boolean>();
  blocked = new Map<string, number>();
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

  async getDailyAttempt(venueId: string, deviceId: string, localDay: string) {
    const key = `${venueId}:${deviceId}:${localDay}`;
    const blockedCount = this.blocked.get(key) ?? 0;
    const hasPosted = this.claims.get(key) ?? false;
    return blockedCount === 0 && !hasPosted
      ? null
      : { hasPosted, blockedCount };
  }

  /** Posts recorded against a network, newest last. */
  postsByIp = new Map<string, Date[]>();

  async countRecentPostsFromIp(ipHash: string, since: Date) {
    const posts = this.postsByIp.get(ipHash) ?? [];
    return posts.filter((at) => at >= since).length;
  }

  async recordBlockedAttempt(
    venueId: string,
    deviceId: string,
    localDay: string,
  ) {
    const key = `${venueId}:${deviceId}:${localDay}`;
    const count = (this.blocked.get(key) ?? 0) + 1;
    this.blocked.set(key, count);
    return count;
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

/** The failure reason, or null when the post succeeded. */
const reasonOf = (result: PostTileResult) => (result.ok ? null : result.reason);

const input = (overrides: Partial<PostTileInput> = {}): PostTileInput => ({
  slug: "cafe-aaaa",
  deviceId: "device-1",
  displayName: "Ahmad",
  caption: "hello",
  image: new Uint8Array([1, 2, 3]),
  ipHash: null,
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
    moderate: vi.fn<PostTileDeps["moderate"]>(async () => ({ allowed: true })),
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

  it("moderates the processed image with the name and caption", async () => {
    await postTile(input(), deps);

    expect(deps.moderate).toHaveBeenCalledWith({
      displayName: "Ahmad",
      caption: "hello",
      image: Buffer.from("webp"),
    });
  });

  it("blocks a flagged post without using up the day", async () => {
    deps.moderate = vi.fn<PostTileDeps["moderate"]>(async () => ({
      allowed: false,
      reason: "openai:hate",
    }));

    expect(await postTile(input(), deps)).toEqual({
      ok: false,
      reason: "blocked",
    });
    expect(store.tiles).toHaveLength(0);
    expect(store.images.size).toBe(0);
    expect([...store.claims.values()]).not.toContain(true);

    // The day is still available for a clean post.
    deps.moderate = vi.fn<PostTileDeps["moderate"]>(async () => ({
      allowed: true,
    }));
    expect((await postTile(input(), deps)).ok).toBe(true);
  });

  it("locks the device on the third blocked attempt, until the reset", async () => {
    deps.moderate = vi.fn<PostTileDeps["moderate"]>(async () => ({
      allowed: false,
      reason: "openai:hate",
    }));

    expect(reasonOf(await postTile(input(), deps))).toBe("blocked");
    expect(reasonOf(await postTile(input(), deps))).toBe("blocked");
    expect(reasonOf(await postTile(input(), deps))).toBe("locked");

    // Locked out even with a clean drawing, without moderating it again.
    deps.moderate = vi.fn<PostTileDeps["moderate"]>(async () => ({
      allowed: true,
    }));
    expect(reasonOf(await postTile(input(), deps))).toBe("locked");
    expect(deps.moderate).not.toHaveBeenCalled();

    // A new venue-local day clears it.
    clock = new Date("2026-09-17T09:00:00Z");
    expect((await postTile(input(), deps)).ok).toBe(true);
  });

  it("refuses the post when moderation can't be reached", async () => {
    deps.moderate = vi.fn(async () => {
      throw new ModerationUnavailableError("TimeoutError");
    });

    expect(await postTile(input(), deps)).toEqual({
      ok: false,
      reason: "moderation-unavailable",
    });
    expect(store.tiles).toHaveLength(0);
    expect(store.blocked.size).toBe(0);

    // Works again as soon as moderation recovers, same day.
    deps.moderate = vi.fn<PostTileDeps["moderate"]>(async () => ({
      allowed: true,
    }));
    expect((await postTile(input(), deps)).ok).toBe(true);
  });

  it("doesn't moderate or process a drawing that can't be posted", async () => {
    await postTile(input(), deps);
    const moderate = vi.fn<PostTileDeps["moderate"]>(async () => ({
      allowed: true,
    }));
    deps.moderate = moderate;
    deps.processImage = vi.fn(async () => Buffer.from("webp"));

    expect(reasonOf(await postTile(input(), deps))).toBe("already-posted");
    expect(moderate).not.toHaveBeenCalled();
    expect(deps.processImage).not.toHaveBeenCalled();
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

describe("burst protection", () => {
  const ipHash = "network-1";

  /** Records `count` posts from the network, all just now. */
  const postedFromNetwork = (count: number) => {
    store.postsByIp.set(
      ipHash,
      Array.from({ length: count }, () => clock),
    );
  };

  it("lets a network post up to the limit", async () => {
    postedFromNetwork(BURST_POST_LIMIT - 1);

    const result = await postTile(input({ ipHash }), deps);

    expect(reasonOf(result)).toBeNull();
  });

  it("turns away a network that's posting in bursts", async () => {
    postedFromNetwork(BURST_POST_LIMIT);

    const result = await postTile(input({ ipHash }), deps);

    expect(reasonOf(result)).toBe("burst");
  });

  it("doesn't use up the day or moderate when it turns one away", async () => {
    postedFromNetwork(BURST_POST_LIMIT);

    await postTile(input({ ipHash }), deps);

    expect(deps.moderate).not.toHaveBeenCalled();
    expect(store.claims.size).toBe(0);
  });

  it("ignores posts older than the window", async () => {
    const stale = new Date(clock.getTime() - BURST_WINDOW_MS - 1);
    store.postsByIp.set(
      ipHash,
      Array.from({ length: BURST_POST_LIMIT }, () => stale),
    );

    const result = await postTile(input({ ipHash }), deps);

    expect(reasonOf(result)).toBeNull();
  });

  it("skips the check when no proxy reported a network", async () => {
    postedFromNetwork(BURST_POST_LIMIT);
    const spy = vi.spyOn(store, "countRecentPostsFromIp");

    const result = await postTile(input({ ipHash: null }), deps);

    expect(spy).not.toHaveBeenCalled();
    expect(reasonOf(result)).toBeNull();
  });
});
