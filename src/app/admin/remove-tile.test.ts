import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type OwnedTile,
  type OwnerTileStore,
  removeTile,
  type RemoveTileDeps,
} from "./remove-tile";

class FakeStore implements OwnerTileStore {
  tiles = new Map<string, OwnedTile>();
  removed: string[] = [];
  deletedImages: string[] = [];
  announced: { venueId: string; tileId: string }[] = [];
  refinalized: string[] = [];
  failImageDelete = false;
  failAnnounce = false;
  failRefinalize = false;

  async findTile(tileId: string) {
    return this.tiles.get(tileId) ?? null;
  }

  async markRemoved(tileId: string) {
    this.removed.push(tileId);
  }

  async refinalizeWeek(weekId: string) {
    if (this.failRefinalize) throw new Error("finalize failed");
    this.refinalized.push(weekId);
  }

  async deleteImage(imagePath: string) {
    if (this.failImageDelete) throw new Error("storage down");
    this.deletedImages.push(imagePath);
  }

  async announceRemoved(venueId: string, tileId: string) {
    if (this.failAnnounce) throw new Error("realtime down");
    this.announced.push({ venueId, tileId });
  }
}

let store: FakeStore;
let deps: RemoveTileDeps;

beforeEach(() => {
  store = new FakeStore();
  store.tiles.set("tile-1", {
    id: "tile-1",
    weekId: "week-1",
    venueId: "venue-1",
    imagePath: "venue-1/week-1/tile-1.webp",
  });
  store.tiles.set("other-tile", {
    id: "other-tile",
    weekId: "week-9",
    venueId: "venue-2",
    imagePath: "venue-2/week-9/other.webp",
  });
  deps = { store, logError: vi.fn() };
});

describe("removeTile", () => {
  it("hides the tile, deletes its image, and tells open boards", async () => {
    await expect(removeTile("venue-1", "tile-1", deps)).resolves.toBe(
      "removed",
    );

    expect(store.removed).toEqual(["tile-1"]);
    expect(store.deletedImages).toEqual(["venue-1/week-1/tile-1.webp"]);
    expect(store.announced).toEqual([{ venueId: "venue-1", tileId: "tile-1" }]);
  });

  it("refuses a tile on someone else's board", async () => {
    await expect(removeTile("venue-1", "other-tile", deps)).resolves.toBe(
      "not-yours",
    );

    expect(store.removed).toEqual([]);
    expect(store.deletedImages).toEqual([]);
  });

  it("reports an unknown tile", async () => {
    await expect(removeTile("venue-1", "missing", deps)).resolves.toBe(
      "not-found",
    );
    expect(store.removed).toEqual([]);
  });

  it("still removes the tile when the image can't be deleted", async () => {
    store.failImageDelete = true;

    await expect(removeTile("venue-1", "tile-1", deps)).resolves.toBe(
      "removed",
    );
    expect(store.removed).toEqual(["tile-1"]);
    expect(store.announced).toHaveLength(1);
    expect(deps.logError).toHaveBeenCalledTimes(1);
  });

  it("still removes the tile when open boards can't be told", async () => {
    store.failAnnounce = true;

    await expect(removeTile("venue-1", "tile-1", deps)).resolves.toBe(
      "removed",
    );
    expect(store.removed).toEqual(["tile-1"]);
    expect(store.deletedImages).toHaveLength(1);
    expect(deps.logError).toHaveBeenCalledTimes(1);
  });
});

describe("removing a tile that won its week", () => {
  it("re-crowns the week it belonged to", async () => {
    await removeTile("venue-1", "tile-1", deps);

    expect(store.refinalized).toEqual(["week-1"]);
  });

  it("still removes the tile when re-crowning fails", async () => {
    store.failRefinalize = true;

    await expect(removeTile("venue-1", "tile-1", deps)).resolves.toBe(
      "removed",
    );
    // The next view of the Hall of Fame finalizes it anyway (ADR-003).
    expect(store.removed).toEqual(["tile-1"]);
    expect(deps.logError).toHaveBeenCalled();
  });

  it("doesn't touch another owner's week", async () => {
    await removeTile("venue-1", "other-tile", deps);

    expect(store.refinalized).toEqual([]);
  });
});
