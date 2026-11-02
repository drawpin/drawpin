import { describe, expect, it, vi } from "vitest";
import { createVenue, type InsertVenue } from "./create-venue";

const input = {
  ownerId: "owner-1",
  name: "Blue Bottle",
  timezone: "UTC",
  moderationLevel: "standard" as const,
};

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
    ).resolves.toEqual({ status: "created", slug: "blue-bottle-k7m2" });

    expect(insert).toHaveBeenCalledWith({
      owner_id: "owner-1",
      name: "Blue Bottle",
      slug: "blue-bottle-k7m2",
      timezone: "UTC",
      moderation_level: "standard",
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
    ).resolves.toEqual({ status: "created", slug: "blue-bottle-bbbb" });

    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[1][0].slug).toBe("blue-bottle-bbbb");
  });

  it("reports the board cap instead of failing (ADR-016)", async () => {
    // As PostgREST returns the venues_enforce_board_limit refusal.
    const insert = vi.fn<InsertVenue>().mockResolvedValue({
      error: { code: "23514", message: "An account can run at most 5 boards" },
    });

    await expect(createVenue(input, insert)).resolves.toEqual({
      status: "limit-reached",
    });
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("doesn't mistake the slug's check constraint for the cap", async () => {
    const insert = vi.fn<InsertVenue>().mockResolvedValue({
      error: {
        code: "23514",
        message:
          'new row for relation "venues" violates check constraint "venues_slug_check"',
      },
    });

    await expect(createVenue(input, insert)).rejects.toThrow(
      /venues_slug_check/,
    );
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
