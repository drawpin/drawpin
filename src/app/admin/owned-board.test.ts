// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { adminDestination } from "./destination";
import {
  type OwnedBoardLookup,
  type OwnerVenue,
  resolveOwnedBoard,
} from "./venue";

const ME = "11111111-1111-4111-8111-111111111111";
const SOMEONE_ELSE = "22222222-2222-4222-8222-222222222222";

function board(slug: string, ownerId: string): OwnerVenue {
  return {
    id: `id-${slug}`,
    ownerId,
    name: slug,
    slug,
    clock: { timeZone: "UTC", change: null },
    isPaused: false,
    moderationLevel: "standard",
  };
}

function lookup(
  boards: OwnerVenue[],
  moved: Record<string, string> = {},
): OwnedBoardLookup {
  return {
    findBySlug: vi.fn(
      async (slug: string) => boards.find((each) => each.slug === slug) ?? null,
    ),
    findMovedSlug: vi.fn(async (slug: string) => moved[slug] ?? null),
  };
}

describe("resolveOwnedBoard", () => {
  it("finds the account's own board", async () => {
    const mine = board("maple-cafe-k7m2", ME);

    await expect(
      resolveOwnedBoard(ME, "maple-cafe-k7m2", lookup([mine])),
    ).resolves.toEqual({ status: "found", venue: mine });
  });

  it("reads someone else's board exactly like a missing one", async () => {
    const theirs = board("their-cafe-a1b2", SOMEONE_ELSE);

    await expect(
      resolveOwnedBoard(ME, "their-cafe-a1b2", lookup([theirs])),
    ).resolves.toEqual({ status: "not-found" });
    await expect(
      resolveOwnedBoard(ME, "nobody-here-0000", lookup([theirs])),
    ).resolves.toEqual({ status: "not-found" });
  });

  it("sends a former slug of the account's board to its current one", async () => {
    const mine = board("new-name-c3d4", ME);

    await expect(
      resolveOwnedBoard(
        ME,
        "old-name-a1b2",
        lookup([mine], { "old-name-a1b2": "new-name-c3d4" }),
      ),
    ).resolves.toEqual({ status: "moved", slug: "new-name-c3d4" });
  });

  it("doesn't follow a former slug of someone else's board", async () => {
    const theirs = board("new-name-c3d4", SOMEONE_ELSE);

    await expect(
      resolveOwnedBoard(
        ME,
        "old-name-a1b2",
        lookup([theirs], { "old-name-a1b2": "new-name-c3d4" }),
      ),
    ).resolves.toEqual({ status: "not-found" });
  });

  it("doesn't look anything up for a slug no board could have", async () => {
    const store = lookup([]);

    await expect(resolveOwnedBoard(ME, "Not A Slug!", store)).resolves.toEqual({
      status: "not-found",
    });
    expect(store.findBySlug).not.toHaveBeenCalled();
  });
});

describe("adminDestination", () => {
  const owned = (slug: string) => ({ venueId: `id-${slug}`, name: slug, slug });

  it("sends an account with no board to setup", () => {
    expect(adminDestination([])).toEqual({ kind: "redirect", to: "/setup" });
  });

  it("goes straight to the only board", () => {
    expect(adminDestination([owned("maple-cafe-k7m2")])).toEqual({
      kind: "redirect",
      to: "/admin/maple-cafe-k7m2",
    });
  });

  it("lists two or more boards", () => {
    const boards = [owned("office-a1b2"), owned("friends-c3d4")];
    expect(adminDestination(boards)).toEqual({ kind: "list", boards });
  });
});
