import { describe, expect, it } from "vitest";
import {
  type BoardDetail,
  boardDetailFrom,
  type DetailWeek,
  hubBoards,
  startCard,
  todayCards,
  waitingLine,
} from "./home-hub";
import type { SidebarBoard } from "./sidebar-boards";

const UTC = { timeZone: "UTC", change: null };

/** A week from its Monday, all boundaries at 4:00 AM UTC. */
function week(monday: string, liveCount = 0, peek: string[] = []): DetailWeek {
  const start = new Date(`${monday}T04:00:00Z`);
  const day = 24 * 60 * 60 * 1000;
  return {
    startsAt: start.toISOString(),
    postingEndsAt: new Date(start.getTime() + 7 * day).toISOString(),
    votingEndsAt: new Date(start.getTime() + 14 * day).toISOString(),
    liveCount,
    peek,
  };
}

function board(
  slug: string,
  status: SidebarBoard["status"],
  extra: Partial<SidebarBoard> = {},
): SidebarBoard {
  return {
    venueId: `id-${slug}`,
    slug,
    name: slug.toUpperCase(),
    latestImageUrl: null,
    status,
    revealIds: [],
    pinnedAt: null,
    owned: false,
    lastVisitedAt: "2026-10-28T12:00:00Z",
    ...extra,
  };
}

const NO_DETAIL: BoardDetail = {
  drawingsThisWeek: 0,
  votingPeek: [],
  votesCloseOn: null,
  finalMonth: null,
};

describe("boardDetailFrom", () => {
  it("counts this week's drawings and peeks at last week's while voting", () => {
    const detail = boardDetailFrom(
      UTC,
      [week("2026-10-19", 9, ["a", "b", "c"]), week("2026-10-26", 4, ["d"])],
      new Date("2026-10-28T12:00:00Z"),
    );
    expect(detail).toEqual({
      drawingsThisWeek: 4,
      votingPeek: ["a", "b", "c"],
      // Voting ends Monday 4:00 AM, as the board says it.
      votesCloseOn: "Monday",
      finalMonth: null,
    });
  });

  it("names the month an open final judges", () => {
    // October's last week finishes voting on 9 November: its final runs
    // that week.
    const detail = boardDetailFrom(
      UTC,
      [
        week("2026-10-05"),
        week("2026-10-12"),
        week("2026-10-19"),
        week("2026-10-26"),
        week("2026-11-02"),
        week("2026-11-09", 2),
      ],
      new Date("2026-11-10T12:00:00Z"),
    );
    expect(detail.finalMonth).toBe("October");
    expect(detail.drawingsThisWeek).toBe(2);
  });

  it("is empty for a board with no weeks yet", () => {
    expect(boardDetailFrom(UTC, [], new Date("2026-10-28T12:00:00Z"))).toEqual(
      NO_DETAIL,
    );
  });
});

describe("todayCards", () => {
  it("orders final, vote, draw, results, keeping board order within a kind", () => {
    const cards = todayCards(
      [
        board("draw-1", "draw"),
        board("results", "results", { revealIds: ["week:w1"] }),
        board("vote", "vote", { votesLeft: 2 }),
        board("quiet", null),
        board("draw-2", "draw"),
        board("final", "final"),
      ],
      new Map(),
    );
    expect(cards.map((card) => card.slug)).toEqual([
      "final",
      "vote",
      "draw-1",
      "draw-2",
      "results",
    ]);
  });

  it("links each kind to its page on the board", () => {
    const cards = todayCards(
      [
        board("a", "final"),
        board("b", "vote"),
        board("c", "draw"),
        board("d", "results"),
      ],
      new Map(),
    );
    expect(cards.map((card) => card.href)).toEqual([
      "/b/a/final",
      "/b/b/vote",
      "/b/c/draw",
      "/b/d",
    ]);
  });

  it("carries the vote card's votes, closing day and peek, and the final's month", () => {
    const details = new Map<string, BoardDetail>([
      [
        "id-vote",
        {
          ...NO_DETAIL,
          votingPeek: ["1", "2", "3"],
          votesCloseOn: "Monday",
        },
      ],
      ["id-final", { ...NO_DETAIL, finalMonth: "October" }],
    ]);
    const [final, vote] = todayCards(
      [board("vote", "vote", { votesLeft: 1 }), board("final", "final")],
      details,
    );
    expect(final).toMatchObject({ kind: "final", month: "October" });
    expect(vote).toMatchObject({
      kind: "vote",
      votesLeft: 1,
      closesOn: "Monday",
      peek: ["1", "2", "3"],
    });
  });

  it("is empty when nothing is waiting, or there are no boards", () => {
    expect(todayCards([board("a", null), board("b", null)], new Map())).toEqual(
      [],
    );
    expect(todayCards([], new Map())).toEqual([]);
  });
});

describe("hubBoards", () => {
  it("keeps the boards' order and adds their drawings and counts", () => {
    const boards = hubBoards(
      [
        board("pinned", null, { pinnedAt: "2026-10-01T00:00:00Z" }),
        board("b", null),
      ],
      new Map([["id-pinned", ["x", "y", "z", "extra"]]]),
      new Map([["id-pinned", { ...NO_DETAIL, drawingsThisWeek: 14 }]]),
    );
    expect(boards.map((entry) => entry.slug)).toEqual(["pinned", "b"]);
    expect(boards[0]).toMatchObject({
      latest: ["x", "y", "z"],
      drawingsThisWeek: 14,
    });
    // A board whose detail couldn't be read shows no count, not a zero.
    expect(boards[1]).toMatchObject({ latest: [], drawingsThisWeek: null });
  });
});

describe("waitingLine", () => {
  it("counts in words up to nine, then digits", () => {
    expect(waitingLine(1, true)).toBe("One thing is waiting on your boards.");
    expect(waitingLine(4, true)).toBe(
      "Four things are waiting on your boards.",
    );
    expect(waitingLine(9, true)).toBe(
      "Nine things are waiting on your boards.",
    );
    expect(waitingLine(12, true)).toBe("12 things are waiting on your boards.");
  });

  it("is caught up with nothing waiting, and points the way with no boards", () => {
    expect(waitingLine(0, true)).toBe(
      "You're all caught up. See you at tomorrow's drawing.",
    );
    expect(waitingLine(0, false)).toBe(
      "Open a board with its code, or start your own.",
    );
  });
});

describe("startCard", () => {
  it("offers a new board under the cap and says so at it", () => {
    expect(startCard(0).canStart).toBe(true);
    expect(startCard(4).canStart).toBe(true);
    expect(startCard(5)).toEqual({
      canStart: false,
      line: "You run 5 boards, the most one account can.",
    });
  });
});
