import { describe, expect, it } from "vitest";
import type { MyDrawing } from "./my-drawings";
import {
  buildTrophies,
  buildVoteSummaries,
  computeStats,
  formatMemberSince,
  groupDrawings,
  type VoteRow,
} from "./profile";

function drawing(id: string, board: string, postedAt: string, win = false) {
  return {
    id,
    boardName: `Board ${board}`,
    boardSlug: board,
    caption: null,
    imageUrl: `https://img/${id}.webp`,
    postedAt,
    isWinner: win,
    deletedAfter: win ? null : "2026-12-01T00:00:00.000Z",
  } satisfies MyDrawing;
}

describe("computeStats", () => {
  it("counts drawings and the distinct boards they were posted on", () => {
    expect(computeStats(["a", "a", "b"], 2, 1)).toEqual({
      drawings: 3,
      weeklyWins: 2,
      superWins: 1,
      boards: 2,
    });
  });

  it("shows zeros for an account that hasn't done anything", () => {
    expect(computeStats([], 0, 0)).toEqual({
      drawings: 0,
      weeklyWins: 0,
      superWins: 0,
      boards: 0,
    });
  });
});

describe("formatMemberSince", () => {
  it("names the month and year", () => {
    expect(formatMemberSince("2026-10-03T12:00:00Z")).toBe("October 2026");
  });
});

describe("groupDrawings", () => {
  it("groups by board, keeping the newest-first order of boards and drawings", () => {
    const groups = groupDrawings(
      [
        drawing("1", "b", "2026-10-05T10:00:00Z"),
        drawing("2", "a", "2026-10-04T10:00:00Z"),
        drawing("3", "b", "2026-10-03T10:00:00Z"),
      ],
      new Set(),
    );
    expect(groups.map((group) => group.boardSlug)).toEqual(["b", "a"]);
    expect(groups[0].drawings.map((d) => d.id)).toEqual(["1", "3"]);
  });

  it("marks weekly and super winners, and leaves the rest unmarked", () => {
    const [group] = groupDrawings(
      [
        drawing("w", "a", "2026-10-05T10:00:00Z", true),
        drawing("s", "a", "2026-10-04T10:00:00Z", true),
        drawing("n", "a", "2026-10-03T10:00:00Z"),
      ],
      new Set(["s"]),
    );
    expect(group.drawings.map((d) => d.win)).toEqual(["weekly", "super", null]);
  });

  it("returns nothing for no drawings", () => {
    expect(groupDrawings([], new Set())).toEqual([]);
  });
});

describe("buildTrophies", () => {
  it("puts weekly and super wins on one shelf, newest first", () => {
    const trophies = buildTrophies(
      [
        {
          tileId: "t1",
          imageUrl: "u1",
          boardName: "Cafe",
          boardSlug: "cafe",
          weekStartsAt: "2026-09-27T18:00:00Z", // Monday 28th, 4am in Sydney
          timezone: "Australia/Sydney",
        },
      ],
      [
        {
          tileId: "t2",
          imageUrl: "u2",
          boardName: "Cafe",
          boardSlug: "cafe",
          month: "2026-09-01",
          endsAt: "2026-10-12T00:00:00Z",
        },
      ],
    );
    expect(trophies.map((t) => t.label)).toEqual([
      "September's super winner",
      "Week of 28 September",
    ]);
    expect(trophies.map((t) => t.kind)).toEqual(["super", "weekly"]);
  });
});

describe("buildVoteSummaries", () => {
  const now = new Date("2026-10-14T12:00:00Z"); // a Wednesday
  const base = {
    boardName: "Cafe",
    boardSlug: "cafe",
    timezone: "UTC",
    votingStartsAt: "2026-10-12T04:00:00Z",
    votingEndsAt: "2026-10-19T04:00:00Z",
    weekId: "w1",
  };
  const vote = (tileId: string, extra: Partial<VoteRow> = {}): VoteRow => ({
    ...base,
    tileId,
    ...extra,
  });

  it("counts votes cast this week and says when voting closes", () => {
    expect(buildVoteSummaries([vote("a"), vote("b")], new Set(), now)).toEqual([
      {
        boardName: "Cafe",
        boardSlug: "cafe",
        cast: 2,
        of: 3,
        note: "Voting closes Monday",
      },
    ]);
  });

  it("says when all three are in", () => {
    const [line] = buildVoteSummaries(
      [vote("a"), vote("b"), vote("c")],
      new Set(),
      now,
    );
    expect(line.note).toBe("All your votes are in");
  });

  it("notes a pick that won last week, only for a recently closed week", () => {
    const closed = {
      weekId: "w0",
      votingStartsAt: "2026-10-05T04:00:00Z",
      votingEndsAt: "2026-10-12T04:00:00Z",
    };
    const [line] = buildVoteSummaries(
      [vote("a", closed), vote("b", closed)],
      new Set(["a"]),
      now,
    );
    expect(line).toMatchObject({ cast: 2, note: "Your pick won last week" });

    const old = {
      weekId: "w-1",
      votingStartsAt: "2026-09-01T04:00:00Z",
      votingEndsAt: "2026-09-08T04:00:00Z",
    };
    expect(buildVoteSummaries([vote("a", old)], new Set(["a"]), now)).toEqual(
      [],
    );
  });

  it("shows nothing when the account hasn't voted", () => {
    expect(buildVoteSummaries([], new Set(), now)).toEqual([]);
  });

  it("prefers the open week over a past win on the same board", () => {
    const closed = {
      weekId: "w0",
      votingStartsAt: "2026-10-05T04:00:00Z",
      votingEndsAt: "2026-10-12T04:00:00Z",
    };
    const lines = buildVoteSummaries(
      [vote("a", closed), vote("b")],
      new Set(["a"]),
      now,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].note).toBe("Voting closes Monday");
  });
});
