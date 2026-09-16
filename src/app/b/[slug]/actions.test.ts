import { beforeEach, describe, expect, it, vi } from "vitest";

const listLiveTiles = vi.fn();
vi.mock("./data", () => ({ listLiveTiles }));

const { loadMoreTiles } = await import("./actions");

const weekId = "5d1c0b8e-6a3f-4c2e-8f1d-2b7a9c4e6f10";
const cursor = {
  createdAt: "2026-09-16T21:30:00.123456+00:00",
  id: "0b6f3f0e-2a8e-4b1a-9f55-4d9f0f6f2c11",
};

describe("loadMoreTiles", () => {
  beforeEach(() => {
    listLiveTiles.mockReset();
  });

  it("returns the next page", async () => {
    listLiveTiles.mockResolvedValue({ tiles: [], nextCursor: null });

    await expect(loadMoreTiles({ weekId, cursor })).resolves.toEqual({
      ok: true,
      tiles: [],
      nextCursor: null,
    });
    expect(listLiveTiles).toHaveBeenCalledWith(weekId, cursor);
  });

  it("accepts any id Postgres' uuid type accepts", async () => {
    listLiveTiles.mockResolvedValue({ tiles: [], nextCursor: null });
    const unversioned = "00000000-0000-0000-0000-00000000c001";

    const result = await loadMoreTiles({
      weekId: unversioned,
      cursor: { ...cursor, id: unversioned },
    });

    expect(result.ok).toBe(true);
  });

  it("rejects malformed input without querying", async () => {
    const result = await loadMoreTiles({ weekId: "nope", cursor });

    expect(result.ok).toBe(false);
    expect(listLiveTiles).not.toHaveBeenCalled();
  });

  it("reports a failed query instead of throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    listLiveTiles.mockRejectedValue(new Error("boom"));

    await expect(loadMoreTiles({ weekId, cursor })).resolves.toEqual({
      ok: false,
      message: "Couldn't load more tiles. Try again.",
    });
  });
});
