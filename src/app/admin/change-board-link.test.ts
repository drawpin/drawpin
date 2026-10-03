import { describe, expect, it, vi } from "vitest";
import { changeBoardLink, type MoveVenueSlug } from "./change-board-link";

function slugsFrom(...slugs: string[]) {
  let i = 0;
  return () => slugs[i++];
}

const taken = {
  error: {
    code: "23505",
    message: 'duplicate key value violates unique constraint "venues_slug_key"',
  },
};

describe("changeBoardLink", () => {
  it("moves the board to a slug made from its name", async () => {
    const move = vi.fn<MoveVenueSlug>().mockResolvedValue({ error: null });
    const makeSlug = vi.fn(() => "maple-street-k7m2");

    await expect(changeBoardLink("Maple Street", move, makeSlug)).resolves.toBe(
      "maple-street-k7m2",
    );
    expect(makeSlug).toHaveBeenCalledWith("Maple Street");
    expect(move).toHaveBeenCalledWith("maple-street-k7m2");
  });

  it("tries a fresh suffix when the slug is or was another board's", async () => {
    const move = vi
      .fn<MoveVenueSlug>()
      .mockResolvedValueOnce(taken)
      .mockResolvedValueOnce({ error: null });

    await expect(
      changeBoardLink(
        "Maple Street",
        move,
        slugsFrom("maple-street-aaaa", "maple-street-bbbb"),
      ),
    ).resolves.toBe("maple-street-bbbb");
    expect(move).toHaveBeenLastCalledWith("maple-street-bbbb");
  });

  it("gives up after five taken slugs", async () => {
    const move = vi.fn<MoveVenueSlug>().mockResolvedValue(taken);

    await expect(
      changeBoardLink("Maple Street", move, () => "maple-street-aaaa"),
    ).rejects.toThrow(/after 5 attempts/);
    expect(move).toHaveBeenCalledTimes(5);
  });

  it("throws on any other database error", async () => {
    const move = vi.fn<MoveVenueSlug>().mockResolvedValue({
      error: { code: "42501", message: "permission denied" },
    });

    await expect(
      changeBoardLink("Maple Street", move, () => "maple-street-aaaa"),
    ).rejects.toThrow(/permission denied/);
    expect(move).toHaveBeenCalledTimes(1);
  });
});
