import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteAccount,
  type DeleteAccountDeps,
  type DeletedTile,
} from "./delete-account";

const tiles: DeletedTile[] = [
  { id: "a", venueId: "v1", imagePath: "v1/w/a.webp", isLive: true },
  { id: "b", venueId: "v2", imagePath: "v2/w/b.webp", isLive: false },
];

describe("deleteAccount", () => {
  let calls: string[];
  let deps: DeleteAccountDeps;

  beforeEach(() => {
    calls = [];
    deps = {
      store: {
        listTilesToDelete: vi.fn(async () => tiles),
        deleteImages: vi.fn(async (paths: string[]) => {
          calls.push(`images ${paths.join(",")}`);
        }),
        deleteTiles: vi.fn(async () => {
          calls.push("tiles");
        }),
        announceRemoved: vi.fn(async (venueId: string, tileId: string) => {
          calls.push(`announce ${venueId} ${tileId}`);
        }),
        deleteLogin: vi.fn(async () => {
          calls.push("login");
        }),
      },
      logError: vi.fn(),
    };
  });

  it("deletes the images, then the tiles, then the login", async () => {
    await deleteAccount("user-1", deps);

    expect(calls).toEqual([
      "images v1/w/a.webp,v2/w/b.webp",
      "tiles",
      // Only a tile still on a board needs open pages told.
      "announce v1 a",
      "login",
    ]);
  });

  it("deletes images in batches", async () => {
    deps.store.listTilesToDelete = vi.fn(async () =>
      Array.from({ length: 230 }, (_, i) => ({
        id: `t${i}`,
        venueId: "v1",
        imagePath: `v1/w/${i}.webp`,
        isLive: false,
      })),
    );

    await deleteAccount("user-1", deps);

    expect(deps.store.deleteImages).toHaveBeenCalledTimes(3);
  });

  it("stops before touching the database when an image can't be deleted", async () => {
    deps.store.deleteImages = vi.fn(async () => {
      throw new Error("storage down");
    });

    await expect(deleteAccount("user-1", deps)).rejects.toThrow("storage down");
    expect(deps.store.deleteTiles).not.toHaveBeenCalled();
    expect(deps.store.deleteLogin).not.toHaveBeenCalled();
  });

  it("carries on when open boards can't be told", async () => {
    deps.store.announceRemoved = vi.fn(async () => {
      throw new Error("realtime down");
    });

    await deleteAccount("user-1", deps);

    expect(deps.store.deleteLogin).toHaveBeenCalledWith("user-1");
    expect(deps.logError).toHaveBeenCalledOnce();
  });

  it("fails, leaving the account, when the login can't be deleted", async () => {
    deps.store.deleteLogin = vi.fn(async () => {
      throw new Error("auth down");
    });

    await expect(deleteAccount("user-1", deps)).rejects.toThrow("auth down");
  });
});
