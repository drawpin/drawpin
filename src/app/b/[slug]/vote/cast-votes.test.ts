// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  castVotes,
  type CastVotesResult,
  VOTES_PER_WEEK,
  VoteRefusedError,
  type VoteStore,
  type VotingWeek,
} from "./cast-votes";

/** An in-memory stand-in with the same rules the database enforces. */
class FakeStore implements VoteStore {
  week: VotingWeek | null = { id: "week-1", venueId: "venue-1" };
  cast = new Map<string, string[]>();
  refuseWith: VoteRefusedError | null = null;

  async findVotingWeek() {
    return this.week;
  }

  async countVotes(weekId: string, userId: string) {
    return (this.cast.get(`${weekId}:${userId}`) ?? []).length;
  }

  async listVotedTileIds(weekId: string, userId: string) {
    return this.cast.get(`${weekId}:${userId}`) ?? [];
  }

  async insertVotes(weekId: string, userId: string, tileIds: string[]) {
    if (this.refuseWith) throw this.refuseWith;
    const key = `${weekId}:${userId}`;
    this.cast.set(key, [...(this.cast.get(key) ?? []), ...tileIds]);
  }
}

let store: FakeStore;

const cast = (tileIds: string[], userId = "user-1") =>
  castVotes({ slug: "cafe-aaaa", userId, tileIds }, store);

const reasonOf = (result: CastVotesResult) =>
  result.ok ? null : result.reason;

beforeEach(() => {
  store = new FakeStore();
});

describe("castVotes", () => {
  it("casts up to three votes and says what's left", async () => {
    await expect(cast(["tile-1", "tile-2"])).resolves.toEqual({
      ok: true,
      votesLeft: 1,
    });
  });

  it("keeps the rest of the week's votes available", async () => {
    await cast(["tile-1"]);

    await expect(cast(["tile-2", "tile-3"])).resolves.toEqual({
      ok: true,
      votesLeft: 0,
    });
  });

  it("refuses a fourth vote", async () => {
    await cast(["tile-1", "tile-2", "tile-3"]);

    expect(reasonOf(await cast(["tile-4"]))).toBe("no-votes-left");
  });

  it("refuses more than the votes left", async () => {
    await cast(["tile-1", "tile-2"]);

    expect(reasonOf(await cast(["tile-3", "tile-4"]))).toBe("too-many");
  });

  it("counts a tile chosen twice once", async () => {
    await expect(cast(["tile-1", "tile-1", "tile-2"])).resolves.toEqual({
      ok: true,
      votesLeft: 1,
    });
  });

  it("refuses an empty selection without asking the database", async () => {
    const spy = vi.spyOn(store, "findVotingWeek");

    expect(reasonOf(await cast([]))).toBe("none-chosen");
    expect(spy).not.toHaveBeenCalled();
  });

  it("refuses when no week is open for voting", async () => {
    store.week = null;

    expect(reasonOf(await cast(["tile-1"]))).toBe("not-voting");
  });

  it("counts each account's votes separately", async () => {
    await cast(["tile-1", "tile-2", "tile-3"]);

    await expect(cast(["tile-1"], "user-2")).resolves.toEqual({
      ok: true,
      votesLeft: VOTES_PER_WEEK - 1,
    });
  });

  it.each(["not-votable", "closed", "already-used"] as const)(
    "passes on a %s refusal from the database",
    async (rejection) => {
      store.refuseWith = new VoteRefusedError(rejection, "from the trigger");

      expect(reasonOf(await cast(["tile-1"]))).toBe(rejection);
    },
  );

  it("lets an unexpected database error surface", async () => {
    store.insertVotes = async () => {
      throw new Error("connection lost");
    };

    await expect(cast(["tile-1"])).rejects.toThrow("connection lost");
  });
});
