import { describe, expect, it, vi } from "vitest";
import { createVenue, type InsertVenue } from "./create-venue";

const input = { ownerId: "owner-1", name: "Blue Bottle", timezone: "UTC" };

function slugsFrom(...slugs: string[]) {
  let i = 0;
  return () => slugs[i++];
}

const duplicate = (constraint: string) => ({
  error: {
    code: "23505",
    message: `duplicate key value violates unique constraint "${constraint}"`,
  },
});

describe("createVenue", () => {
  it("inserts the venue with a generated slug", async () => {
    const insert = vi.fn<InsertVenue>().mockResolvedValue({ error: null });

    await expect(
      createVenue(input, insert, slugsFrom("blue-bottle-k7m2")),
    ).resolves.toBe("created");

    expect(insert).toHaveBeenCalledWith({
      owner_id: "owner-1",
      name: "Blue Bottle",
      slug: "blue-bottle-k7m2",
      timezone: "UTC",
    });
  });

  it("retries with a new slug when the slug is taken", async () => {
    const insert = vi
      .fn<InsertVenue>()
      .mockResolvedValueOnce(duplicate("venues_slug_key"))
      .mockResolvedValueOnce({ error: null });

    await expect(
      createVenue(
        input,
        insert,
        slugsFrom("blue-bottle-aaaa", "blue-bottle-bbbb"),
      ),
    ).resolves.toBe("created");

    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[1][0].slug).toBe("blue-bottle-bbbb");
  });

  it("reports an existing venue instead of failing", async () => {
    const insert = vi
      .fn<InsertVenue>()
      .mockResolvedValue(duplicate("venues_owner_id_key"));

    await expect(createVenue(input, insert)).resolves.toBe("already-exists");
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("gives up after repeated slug collisions", async () => {
    const insert = vi
      .fn<InsertVenue>()
      .mockResolvedValue(duplicate("venues_slug_key"));

    await expect(createVenue(input, insert)).rejects.toThrow(/free board slug/);
    expect(insert).toHaveBeenCalledTimes(5);
  });

  it("throws on unexpected database errors", async () => {
    const insert = vi.fn<InsertVenue>().mockResolvedValue({
      error: { code: "42501", message: "permission denied" },
    });

    await expect(createVenue(input, insert)).rejects.toThrow(
      /permission denied/,
    );
  });
});
