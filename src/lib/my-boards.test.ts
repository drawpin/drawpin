import { beforeEach, describe, expect, it } from "vitest";
import {
  type BoardVisit,
  hideBoard,
  listMyBoards,
  MAX_BOARDS_PER_ACCOUNT,
  MAX_LISTED_BOARDS,
  MAX_PINNED_BOARDS,
  mergeDeviceBoards,
  type MyBoardsStore,
  orderMyBoards,
  type OwnedBoard,
  ownedBoardCount,
  pinBoard,
  planMerge,
  recordVisit,
  unhideBoard,
  unpinBoard,
  type VisitWrite,
} from "./my-boards";

const USER = "11111111-1111-4111-8111-111111111111";

/** A board id, readable in failures: the n-th board. */
function boardId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function visit(n: number, overrides: Partial<BoardVisit> = {}): BoardVisit {
  return {
    venueId: boardId(n),
    name: `Board ${n}`,
    slug: `board-${n}`,
    lastVisitedAt: `2026-11-01T${String(n % 24).padStart(2, "0")}:00:00.000Z`,
    pinnedAt: null,
    hiddenAt: null,
    ...overrides,
  };
}

/** An in-memory {@link MyBoardsStore} for one account. */
class MemoryStore implements MyBoardsStore {
  boards = new Map<string, { name: string; slug: string }>();
  formerSlugs = new Map<string, string>();
  visits = new Map<string, BoardVisit>();
  owned: OwnedBoard[] = [];
  writes: VisitWrite[][] = [];

  addBoard(n: number) {
    this.boards.set(boardId(n), { name: `Board ${n}`, slug: `board-${n}` });
  }

  async listVisits(userId: string, limit: number) {
    expect(userId).toBe(USER);
    return [...this.visits.values()]
      .filter((each) => each.hiddenAt === null)
      .slice(0, limit);
  }
  async findVisit(_userId: string, venueId: string) {
    return this.visits.get(venueId) ?? null;
  }
  async listVisitsTo(_userId: string, venueIds: string[]) {
    return venueIds.flatMap((id) => this.visits.get(id) ?? []);
  }
  async writeVisits(_userId: string, writes: VisitWrite[]) {
    this.writes.push(writes);
    for (const write of writes) {
      const board = this.boards.get(write.venueId)!;
      const before = this.visits.get(write.venueId);
      this.visits.set(write.venueId, {
        venueId: write.venueId,
        name: board.name,
        slug: board.slug,
        lastVisitedAt: write.lastVisitedAt,
        pinnedAt: before?.pinnedAt ?? null,
        hiddenAt: write.unhide ? null : (before?.hiddenAt ?? null),
      });
    }
  }
  async countPinned() {
    return [...this.visits.values()].filter((each) => each.pinnedAt).length;
  }
  async setPinned(_userId: string, venueId: string, pinnedAt: string | null) {
    const found = this.visits.get(venueId);
    if (!found) return false;
    found.pinnedAt = pinnedAt;
    return true;
  }
  async setHidden(_userId: string, venueId: string, hiddenAt: string) {
    const found = this.visits.get(venueId);
    if (!found) return false;
    found.hiddenAt = hiddenAt;
    found.pinnedAt = null;
    return true;
  }
  async resolveSlugs(slugs: string[]) {
    const resolved = new Map<string, string>();
    for (const [id, board] of this.boards) {
      if (slugs.includes(board.slug)) resolved.set(board.slug, id);
    }
    for (const [slug, id] of this.formerSlugs) {
      if (slugs.includes(slug)) resolved.set(slug, id);
    }
    return resolved;
  }
  async listOwnedBoards() {
    return this.owned;
  }
  async countOwnedBoards() {
    return this.owned.length;
  }
}

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  for (let n = 1; n <= 30; n++) store.addBoard(n);
});

describe("MAX_BOARDS_PER_ACCOUNT", () => {
  it("matches the database cap in the migration", () => {
    // venues_enforce_board_limit's v_max; raise both together.
    expect(MAX_BOARDS_PER_ACCOUNT).toBe(5);
  });
});

describe("orderMyBoards", () => {
  it("puts pinned boards first, in the order they were pinned", () => {
    const ordered = orderMyBoards(
      [
        visit(1),
        visit(2, { pinnedAt: "2026-11-01T10:00:00Z" }),
        visit(3, { pinnedAt: "2026-11-01T09:00:00Z" }),
        visit(4),
      ],
      new Set(),
    );

    expect(ordered.map((board) => board.name)).toEqual([
      "Board 3",
      "Board 2",
      "Board 4",
      "Board 1",
    ]);
  });

  it("lists the rest most recently opened first", () => {
    const ordered = orderMyBoards(
      [
        visit(1, { lastVisitedAt: "2026-10-01T00:00:00Z" }),
        visit(2, { lastVisitedAt: "2026-11-01T00:00:00Z" }),
        visit(3, { lastVisitedAt: "2026-10-15T00:00:00Z" }),
      ],
      new Set(),
    );

    expect(ordered.map((board) => board.name)).toEqual([
      "Board 2",
      "Board 3",
      "Board 1",
    ]);
  });

  it("leaves out boards removed from the list", () => {
    const ordered = orderMyBoards(
      [visit(1), visit(2, { hiddenAt: "2026-11-01T12:00:00Z" })],
      new Set(),
    );

    expect(ordered.map((board) => board.name)).toEqual(["Board 1"]);
  });

  it(`keeps no more than ${MAX_LISTED_BOARDS}`, () => {
    const visits = Array.from({ length: 25 }, (_, i) => visit(i + 1));

    expect(orderMyBoards(visits, new Set())).toHaveLength(MAX_LISTED_BOARDS);
  });

  it("marks the boards the account runs", () => {
    const ordered = orderMyBoards([visit(1), visit(2)], new Set([boardId(2)]));

    expect(ordered.map((board) => board.isOwner)).toEqual([true, false]);
  });
});

describe("recordVisit", () => {
  it("adds the board, and brings back one the account removed", async () => {
    await recordVisit(
      USER,
      boardId(1),
      store,
      new Date("2026-11-02T08:00:00Z"),
    );
    await hideBoard(USER, boardId(1), store);
    expect(await listMyBoards(USER, store)).toEqual([]);

    await recordVisit(
      USER,
      boardId(1),
      store,
      new Date("2026-11-02T09:00:00Z"),
    );

    expect(await listMyBoards(USER, store)).toEqual([
      expect.objectContaining({
        venueId: boardId(1),
        lastVisitedAt: "2026-11-02T09:00:00.000Z",
      }),
    ]);
  });

  it("refuses something that isn't a board id", async () => {
    await expect(recordVisit(USER, "board-1", store)).rejects.toThrow();
  });
});

describe("pinBoard", () => {
  it("pins a board the account has opened", async () => {
    await recordVisit(USER, boardId(1), store);

    expect(await pinBoard(USER, boardId(1), store)).toBe("pinned");
    expect(store.visits.get(boardId(1))?.pinnedAt).not.toBeNull();
  });

  it("won't pin a board the account never opened", async () => {
    expect(await pinBoard(USER, boardId(1), store)).toBe("not-found");
  });

  it("says so when it's already pinned", async () => {
    await recordVisit(USER, boardId(1), store);
    await pinBoard(USER, boardId(1), store);

    expect(await pinBoard(USER, boardId(1), store)).toBe("already-pinned");
  });

  it(`stops at ${MAX_PINNED_BOARDS} pinned boards`, async () => {
    for (let n = 1; n <= MAX_PINNED_BOARDS + 1; n++) {
      await recordVisit(USER, boardId(n), store);
    }
    for (let n = 1; n <= MAX_PINNED_BOARDS; n++) {
      expect(await pinBoard(USER, boardId(n), store)).toBe("pinned");
    }

    expect(await pinBoard(USER, boardId(MAX_PINNED_BOARDS + 1), store)).toBe(
      "limit-reached",
    );

    await unpinBoard(USER, boardId(1), store);
    expect(await pinBoard(USER, boardId(MAX_PINNED_BOARDS + 1), store)).toBe(
      "pinned",
    );
  });

  it("brings back a removed board, pinned", async () => {
    await recordVisit(USER, boardId(1), store);
    await hideBoard(USER, boardId(1), store);

    expect(await pinBoard(USER, boardId(1), store)).toBe("pinned");
    expect(await listMyBoards(USER, store)).toEqual([
      expect.objectContaining({ venueId: boardId(1) }),
    ]);
  });
});

describe("hideBoard", () => {
  it("unpins the board it hides", async () => {
    await recordVisit(USER, boardId(1), store);
    await pinBoard(USER, boardId(1), store);

    expect(await hideBoard(USER, boardId(1), store)).toBe(true);
    expect(store.visits.get(boardId(1))?.pinnedAt).toBeNull();
  });

  it("does nothing for a board the account never opened", async () => {
    expect(await hideBoard(USER, boardId(1), store)).toBe(false);
  });
});

describe("unhideBoard", () => {
  it("puts a removed board back, pinned where it was", async () => {
    await recordVisit(
      USER,
      boardId(1),
      store,
      new Date("2026-11-01T08:00:00Z"),
    );
    await pinBoard(USER, boardId(1), store, new Date("2026-11-01T09:00:00Z"));
    const pinnedAt = store.visits.get(boardId(1))!.pinnedAt;
    await hideBoard(USER, boardId(1), store);

    expect(await unhideBoard(USER, boardId(1), store, pinnedAt)).toBe(true);
    expect(store.visits.get(boardId(1))).toMatchObject({
      hiddenAt: null,
      pinnedAt,
      lastVisitedAt: "2026-11-01T08:00:00.000Z",
    });
  });

  it("leaves it unpinned when the pins filled up meanwhile", async () => {
    for (let n = 1; n <= MAX_PINNED_BOARDS + 1; n++) {
      await recordVisit(USER, boardId(n), store);
    }
    await pinBoard(USER, boardId(1), store);
    const pinnedAt = store.visits.get(boardId(1))!.pinnedAt;
    await hideBoard(USER, boardId(1), store);
    for (let n = 2; n <= MAX_PINNED_BOARDS + 1; n++) {
      await pinBoard(USER, boardId(n), store);
    }

    await unhideBoard(USER, boardId(1), store, pinnedAt);
    expect(store.visits.get(boardId(1))).toMatchObject({
      hiddenAt: null,
      pinnedAt: null,
    });
  });

  it("does nothing for a board the account never opened", async () => {
    expect(await unhideBoard(USER, boardId(1), store)).toBe(false);
  });
});

describe("planMerge", () => {
  const slugs = new Map([
    ["board-1", boardId(1)],
    ["old-board-1", boardId(1)],
    ["board-2", boardId(2)],
  ]);

  it("adds boards the account hasn't opened", () => {
    expect(
      planMerge(
        [{ slug: "board-2", lastVisitedAt: new Date("2026-11-01T00:00:00Z") }],
        slugs,
        [],
      ),
    ).toEqual([
      {
        venueId: boardId(2),
        lastVisitedAt: "2026-11-01T00:00:00.000Z",
        unhide: true,
      },
    ]);
  });

  it("drops slugs no board has", () => {
    expect(
      planMerge(
        [{ slug: "gone", lastVisitedAt: new Date("2026-11-01T00:00:00Z") }],
        slugs,
        [],
      ),
    ).toEqual([]);
  });

  it("counts a former slug as its board, keeping the latest visit", () => {
    expect(
      planMerge(
        [
          {
            slug: "old-board-1",
            lastVisitedAt: new Date("2026-11-01T00:00:00Z"),
          },
          { slug: "board-1", lastVisitedAt: new Date("2026-10-01T00:00:00Z") },
        ],
        slugs,
        [],
      ),
    ).toEqual([
      {
        venueId: boardId(1),
        lastVisitedAt: "2026-11-01T00:00:00.000Z",
        unhide: true,
      },
    ]);
  });

  it("never moves an account's visit back in time", () => {
    expect(
      planMerge(
        [{ slug: "board-1", lastVisitedAt: new Date("2026-10-01T00:00:00Z") }],
        slugs,
        [visit(1, { lastVisitedAt: "2026-11-01T00:00:00Z" })],
      ),
    ).toEqual([]);
  });

  it("brings back a removed board only if the device opened it since", () => {
    const hidden = visit(1, {
      lastVisitedAt: "2026-10-01T00:00:00Z",
      hiddenAt: "2026-10-15T00:00:00Z",
    });

    expect(
      planMerge(
        [{ slug: "board-1", lastVisitedAt: new Date("2026-10-10T00:00:00Z") }],
        slugs,
        [hidden],
      ),
    ).toEqual([
      {
        venueId: boardId(1),
        lastVisitedAt: "2026-10-10T00:00:00.000Z",
        unhide: false,
      },
    ]);
    expect(
      planMerge(
        [{ slug: "board-1", lastVisitedAt: new Date("2026-10-20T00:00:00Z") }],
        slugs,
        [hidden],
      ),
    ).toEqual([
      {
        venueId: boardId(1),
        lastVisitedAt: "2026-10-20T00:00:00.000Z",
        unhide: true,
      },
    ]);
  });
});

describe("mergeDeviceBoards", () => {
  it("adds the device's boards to the account, current and former slugs", async () => {
    store.formerSlugs.set("old-board-3", boardId(3));

    const added = await mergeDeviceBoards(
      USER,
      [
        { slug: "board-1", lastVisitedAt: new Date("2026-11-01T00:00:00Z") },
        {
          slug: "old-board-3",
          lastVisitedAt: new Date("2026-11-02T00:00:00Z"),
        },
        { slug: "nobody-has-this", lastVisitedAt: new Date() },
      ],
      store,
    );

    expect(added).toBe(2);
    expect(
      (await listMyBoards(USER, store)).map((board) => board.slug),
    ).toEqual(["board-3", "board-1"]);
  });

  it("ignores slugs that can't be a board's without asking the database", async () => {
    const added = await mergeDeviceBoards(
      USER,
      [{ slug: "Not A Slug", lastVisitedAt: new Date() }],
      store,
    );

    expect(added).toBe(0);
    expect(store.writes).toEqual([]);
  });
});

describe("owned boards", () => {
  it("lists and counts the boards the account runs", async () => {
    store.owned = [{ venueId: boardId(1), name: "Board 1", slug: "board-1" }];

    expect(await ownedBoardCount(USER, store)).toBe(1);
    await recordVisit(USER, boardId(1), store);
    expect(await listMyBoards(USER, store)).toEqual([
      expect.objectContaining({ venueId: boardId(1), isOwner: true }),
    ]);
  });
});
