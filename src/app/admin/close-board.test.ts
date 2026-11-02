import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeBoard, type CloseBoardDeps } from "./close-board";

const venue = { id: "venue-1", name: "Maple Street Café", ownerId: "owner-1" };

describe("closeBoard", () => {
  let calls: string[];
  let deps: CloseBoardDeps;

  beforeEach(() => {
    calls = [];
    deps = {
      store: {
        listImagePaths: vi.fn(async () =>
          Array.from({ length: 150 }, (_, i) => `venue-1/w/${i}.webp`),
        ),
        deleteImages: vi.fn(async (paths: string[]) => {
          calls.push(`images ${paths.length}`);
        }),
        closeVenue: vi.fn(async () => {
          calls.push("venue");
        }),
        countOwnedBoards: vi.fn(async () => 0),
        hasProfile: vi.fn(async () => false),
        deleteLogin: vi.fn(async () => {
          calls.push("login");
        }),
      },
      logError: vi.fn(),
    };
  });

  it("deletes the images, the board, then the login with the last board", async () => {
    expect(await closeBoard(venue, "Maple Street Café", deps)).toBe(
      "closed-account",
    );
    expect(calls).toEqual(["images 100", "images 50", "venue", "login"]);
  });

  it("accepts the name typed in any case and spacing", async () => {
    expect(await closeBoard(venue, "  maple  street CAFÉ ", deps)).toBe(
      "closed-account",
    );
  });

  it("does nothing unless the board's name is typed", async () => {
    expect(await closeBoard(venue, "Maple Street", deps)).toBe("name-mismatch");
    expect(calls).toEqual([]);
  });

  it("leaves the board untouched when an image can't be deleted", async () => {
    deps.store.deleteImages = vi.fn(async () => {
      throw new Error("storage down");
    });

    await expect(closeBoard(venue, venue.name, deps)).rejects.toThrow(
      "storage down",
    );
    expect(deps.store.closeVenue).not.toHaveBeenCalled();
  });

  it("keeps the login while the account runs other boards (ADR-016)", async () => {
    deps.store.countOwnedBoards = vi.fn(async () => 2);

    expect(await closeBoard(venue, venue.name, deps)).toBe("closed");
    expect(calls).toEqual(["images 100", "images 50", "venue"]);
    expect(deps.store.countOwnedBoards).toHaveBeenCalledWith("owner-1");
    expect(deps.store.deleteLogin).not.toHaveBeenCalled();
  });

  it("counts the boards left after the close, not before", async () => {
    let open = 1;
    deps.store.closeVenue = vi.fn(async () => {
      open -= 1;
    });
    deps.store.countOwnedBoards = vi.fn(async () => open);

    expect(await closeBoard(venue, venue.name, deps)).toBe("closed-account");
  });

  it("keeps the login of an owner who also draws", async () => {
    deps.store.hasProfile = vi.fn(async () => true);

    expect(await closeBoard(venue, venue.name, deps)).toBe("closed");
    expect(calls).toEqual(["images 100", "images 50", "venue"]);
    expect(deps.store.deleteLogin).not.toHaveBeenCalled();
  });

  it("keeps the login when it can't tell whether other boards remain", async () => {
    deps.store.countOwnedBoards = vi.fn(async () => {
      throw new Error("db down");
    });

    expect(await closeBoard(venue, venue.name, deps)).toBe("closed");
    expect(deps.store.deleteLogin).not.toHaveBeenCalled();
    expect(deps.logError).toHaveBeenCalledOnce();
  });

  it("still reports the board closed when the login can't be deleted", async () => {
    deps.store.deleteLogin = vi.fn(async () => {
      throw new Error("auth down");
    });

    expect(await closeBoard(venue, venue.name, deps)).toBe("closed");
    expect(deps.logError).toHaveBeenCalledOnce();
  });
});
