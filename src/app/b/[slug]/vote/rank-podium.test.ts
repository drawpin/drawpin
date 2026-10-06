import { describe, expect, it } from "vitest";
import { type CastVote, rankPodium } from "./rank-podium";

const vote = (tileId: string, tileCreatedAt: string): CastVote => ({
  tileId,
  tileCreatedAt,
});

describe("rankPodium", () => {
  it("puts the most votes first", () => {
    expect(
      rankPodium([
        vote("a", "2026-10-01T10:00:00Z"),
        vote("b", "2026-10-01T11:00:00Z"),
        vote("b", "2026-10-01T11:00:00Z"),
        vote("c", "2026-10-01T12:00:00Z"),
        vote("c", "2026-10-01T12:00:00Z"),
        vote("c", "2026-10-01T12:00:00Z"),
      ]),
    ).toEqual([
      { tileId: "c", votes: 3 },
      { tileId: "b", votes: 2 },
      { tileId: "a", votes: 1 },
    ]);
  });

  it("gives a tie to the earlier post, as the winner rule does", () => {
    expect(
      rankPodium([
        vote("late", "2026-10-01T12:00:00Z"),
        vote("early", "2026-10-01T09:00:00Z"),
      ]),
    ).toEqual([
      { tileId: "early", votes: 1 },
      { tileId: "late", votes: 1 },
    ]);
  });

  it("compares post times as moments, not as text", () => {
    expect(
      rankPodium([
        vote("utc", "2026-10-01T10:00:00Z"),
        vote("offset", "2026-10-01T09:30:00+00:00"),
      ]).map((place) => place.tileId),
    ).toEqual(["offset", "utc"]);
  });

  it("keeps only the top three", () => {
    const votes = ["a", "b", "c", "d"].map((id, index) =>
      vote(id, `2026-10-01T1${index}:00:00Z`),
    );
    expect(rankPodium(votes)).toHaveLength(3);
  });

  it("is empty before anyone has voted", () => {
    expect(rankPodium([])).toEqual([]);
  });
});
