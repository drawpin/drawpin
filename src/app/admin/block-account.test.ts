import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  blockAuthor,
  type BlockAuthorDeps,
  type BlockStore,
} from "./block-account";
import type { RemoveTileResult } from "./remove-tile";

const VENUE = "venue-1";

function fakeStore(
  author: { venueId: string; userId: string | null } | null,
  liveTileIds: string[] = [],
) {
  const calls: string[] = [];
  const store: BlockStore = {
    findAuthor: vi.fn(async () => author),
    addBlock: vi.fn(async (venueId: string, userId: string) => {
      calls.push(`block ${venueId} ${userId}`);
    }),
    listLiveTileIds: vi.fn(async () => {
      calls.push("list");
      return liveTileIds;
    }),
  };
  return { store, calls };
}

describe("blockAuthor", () => {
  let deps: BlockAuthorDeps;
  let removed: string[];

  beforeEach(() => {
    removed = [];
    deps = {
      store: fakeStore({ venueId: VENUE, userId: "user-1" }, ["a", "b"]).store,
      removeTile: vi.fn(async (tileId: string): Promise<RemoveTileResult> => {
        removed.push(tileId);
        return "removed";
      }),
      logError: vi.fn(),
    };
  });

  it("blocks the tile's author first, then removes all their tiles", async () => {
    const { store, calls } = fakeStore({ venueId: VENUE, userId: "user-1" }, [
      "a",
      "b",
    ]);
    deps.store = store;

    expect(await blockAuthor(VENUE, "a", deps)).toEqual({
      status: "blocked",
      removed: 2,
      failed: 0,
    });
    expect(calls).toEqual([`block ${VENUE} user-1`, "list"]);
    expect(removed).toEqual(["a", "b"]);
  });

  it("refuses a tile on someone else's board", async () => {
    deps.store = fakeStore({ venueId: "venue-2", userId: "user-1" }).store;

    expect(await blockAuthor(VENUE, "a", deps)).toEqual({
      status: "not-yours",
    });
    expect(deps.store.addBlock).not.toHaveBeenCalled();
  });

  it("refuses a guest tile, which has no account to block", async () => {
    deps.store = fakeStore({ venueId: VENUE, userId: null }).store;

    expect(await blockAuthor(VENUE, "a", deps)).toEqual({ status: "guest" });
    expect(deps.store.addBlock).not.toHaveBeenCalled();
  });

  it("refuses a tile that doesn't exist", async () => {
    deps.store = fakeStore(null).store;

    expect(await blockAuthor(VENUE, "a", deps)).toEqual({
      status: "not-found",
    });
  });

  it("keeps removing the rest when one tile fails", async () => {
    deps.removeTile = vi
      .fn<(tileId: string) => Promise<RemoveTileResult>>()
      .mockRejectedValueOnce(new Error("storage down"))
      .mockResolvedValueOnce("removed");

    expect(await blockAuthor(VENUE, "a", deps)).toEqual({
      status: "blocked",
      removed: 1,
      failed: 1,
    });
    expect(deps.logError).toHaveBeenCalledOnce();
  });
});
