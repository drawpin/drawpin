// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CleanupDeps,
  type CleanupStore,
  DEVICE_RETENTION_DAYS,
  type PurgeableTile,
  RETENTION_DAYS,
  runCleanup,
} from "./purge";

/** An in-memory stand-in for the database and the image bucket. */
class FakeStore implements CleanupStore {
  weeks = new Map<string, PurgeableTile[]>();
  crowned: string[] = [];
  deletedImages: string[] = [];
  deletedTiles: string[] = [];
  cutoffs: { attempts?: Date; devices?: Date } = {};
  failCrownFor: string | null = null;
  failImageFor: string | null = null;
  failTileFor: string | null = null;

  async listExpiredWeeks() {
    return [...this.weeks.keys()];
  }

  async finalizeWeek(weekId: string) {
    if (this.failCrownFor === weekId) throw new Error("could not crown");
    this.crowned.push(weekId);
  }

  async listPurgeableTiles(weekId: string) {
    return this.weeks.get(weekId) ?? [];
  }

  async deleteImage(imagePath: string) {
    if (this.failImageFor === imagePath) throw new Error("storage down");
    this.deletedImages.push(imagePath);
  }

  async deleteTile(tileId: string) {
    if (this.failTileFor === tileId) throw new Error("delete failed");
    this.deletedTiles.push(tileId);
  }

  async deleteOldPostAttempts(before: Date) {
    this.cutoffs.attempts = before;
    return 7;
  }

  async deleteUnusedDevices(before: Date) {
    this.cutoffs.devices = before;
    return 3;
  }
}

const NOW = new Date("2026-09-18T09:00:00Z");

let store: FakeStore;
let deps: CleanupDeps;

const tile = (id: string): PurgeableTile => ({
  id,
  imagePath: `venue/week/${id}.webp`,
});

beforeEach(() => {
  store = new FakeStore();
  store.weeks.set("week-1", [tile("tile-1"), tile("tile-2")]);
  deps = { store, now: () => NOW, logError: vi.fn() };
});

describe("runCleanup", () => {
  it("deletes each expired week's leftovers", async () => {
    const summary = await runCleanup(deps);

    expect(summary).toMatchObject({ weeks: 1, tilesDeleted: 2, tilesKept: 0 });
    expect(store.deletedTiles).toEqual(["tile-1", "tile-2"]);
  });

  it("crowns a week before deleting anything from it", async () => {
    await runCleanup(deps);

    // A venue nobody visited would otherwise lose a winner never chosen.
    expect(store.crowned).toEqual(["week-1"]);
  });

  it("leaves a week alone when it can't be crowned", async () => {
    store.failCrownFor = "week-1";

    const summary = await runCleanup(deps);

    expect(store.deletedTiles).toEqual([]);
    expect(summary.tilesDeleted).toBe(0);
    expect(deps.logError).toHaveBeenCalled();
  });

  it("deletes the image before the row", async () => {
    const order: string[] = [];
    store.deleteImage = async (path) => {
      order.push(`image:${path}`);
    };
    store.deleteTile = async (id) => {
      order.push(`row:${id}`);
    };

    await runCleanup(deps);

    // A row without its image is a broken tile; an image without its row is a
    // public URL nobody can take down.
    expect(order[0]).toBe("image:venue/week/tile-1.webp");
    expect(order[1]).toBe("row:tile-1");
  });

  it("keeps the row when its image can't be deleted", async () => {
    store.failImageFor = "venue/week/tile-1.webp";

    const summary = await runCleanup(deps);

    expect(store.deletedTiles).toEqual(["tile-2"]);
    expect(summary).toMatchObject({ tilesDeleted: 1, tilesKept: 1 });
  });

  it("carries on when one row refuses to go", async () => {
    store.failTileFor = "tile-1";

    const summary = await runCleanup(deps);

    expect(store.deletedTiles).toEqual(["tile-2"]);
    expect(summary).toMatchObject({ tilesDeleted: 1, tilesKept: 1 });
  });

  it("measures retention from the day it runs", async () => {
    await runCleanup(deps);

    const days = (date: Date) =>
      Math.round((NOW.getTime() - date.getTime()) / 86_400_000);
    expect(days(store.cutoffs.attempts!)).toBe(RETENTION_DAYS);
    expect(days(store.cutoffs.devices!)).toBe(DEVICE_RETENTION_DAYS);
  });

  it("reports what it deleted", async () => {
    const summary = await runCleanup(deps);

    expect(summary).toEqual({
      weeks: 1,
      tilesDeleted: 2,
      tilesKept: 0,
      postAttemptsDeleted: 7,
      devicesDeleted: 3,
    });
  });

  it("finds nothing to do on a second run", async () => {
    await runCleanup(deps);
    store.weeks.set("week-1", []);

    const summary = await runCleanup(deps);

    expect(summary).toMatchObject({ tilesDeleted: 0, tilesKept: 0 });
  });
});
