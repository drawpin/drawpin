import { describe, expect, it } from "vitest";
import {
  type BoardFacts,
  type BoardStatusStore,
  lastVisitLabel,
  loadBoardStatuses,
  type StatusFinal,
  type StatusWeek,
  statusFromFacts,
  statusWords,
} from "./board-status";

const NOTHING: BoardFacts = {
  isPaused: false,
  postedToday: true,
  votingOpen: false,
  votesCast: 0,
  votableTiles: 0,
  finalOpen: false,
  votedInFinal: false,
  revealIds: [],
};

describe("statusFromFacts", () => {
  it("is nothing when there's nothing to do", () => {
    expect(statusFromFacts(NOTHING).status).toBeNull();
  });

  it("asks for today's drawing until there is one", () => {
    expect(statusFromFacts({ ...NOTHING, postedToday: false }).status).toBe(
      "draw",
    );
  });

  it("doesn't ask for a drawing on a paused board", () => {
    expect(
      statusFromFacts({ ...NOTHING, postedToday: false, isPaused: true })
        .status,
    ).toBeNull();
  });

  it("counts the votes left, but no more than there are drawings to vote for", () => {
    expect(
      statusFromFacts({
        ...NOTHING,
        votingOpen: true,
        votesCast: 1,
        votableTiles: 10,
      }),
    ).toMatchObject({ status: "vote", votesLeft: 2 });
    expect(
      statusFromFacts({
        ...NOTHING,
        votingOpen: true,
        votesCast: 0,
        votableTiles: 1,
      }),
    ).toMatchObject({ status: "vote", votesLeft: 1 });
  });

  it("has nothing to vote on with all votes cast, or nothing votable", () => {
    expect(
      statusFromFacts({
        ...NOTHING,
        votingOpen: true,
        votesCast: 3,
        votableTiles: 10,
      }).status,
    ).toBeNull();
    expect(
      statusFromFacts({ ...NOTHING, votingOpen: true, votableTiles: 0 }).status,
    ).toBeNull();
  });

  it("shows the final until the account has voted in it", () => {
    expect(statusFromFacts({ ...NOTHING, finalOpen: true }).status).toBe(
      "final",
    );
    expect(
      statusFromFacts({ ...NOTHING, finalOpen: true, votedInFinal: true })
        .status,
    ).toBeNull();
  });

  it("puts final before vote before draw before results", () => {
    const everything: BoardFacts = {
      ...NOTHING,
      postedToday: false,
      votingOpen: true,
      votableTiles: 5,
      finalOpen: true,
      revealIds: ["week:1"],
    };
    expect(statusFromFacts(everything).status).toBe("final");
    expect(statusFromFacts({ ...everything, finalOpen: false }).status).toBe(
      "vote",
    );
    expect(
      statusFromFacts({ ...everything, finalOpen: false, votingOpen: false })
        .status,
    ).toBe("draw");
    expect(
      statusFromFacts({
        ...everything,
        finalOpen: false,
        votingOpen: false,
        postedToday: true,
      }),
    ).toEqual({ status: "results", revealIds: ["week:1"] });
  });
});

describe("statusWords", () => {
  it.each([
    [{ status: "final" as const }, "Final is open"],
    [{ status: "vote" as const, votesLeft: 3 }, "3 votes left"],
    [{ status: "vote" as const, votesLeft: 1 }, "1 vote left"],
    [{ status: "draw" as const }, "Draw today"],
    [{ status: "results" as const }, "Results are in"],
    [{ status: null }, null],
  ])("%j reads %j", (info, words) => {
    expect(statusWords(info)).toBe(words);
  });
});

describe("lastVisitLabel", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  it.each([
    ["2026-11-20T11:00:00Z", "Today"],
    ["2026-11-19T11:00:00Z", "Yesterday"],
    ["2026-11-17T11:00:00Z", "3 days ago"],
    ["2026-11-12T11:00:00Z", "Last week"],
    ["2026-10-30T11:00:00Z", "3 weeks ago"],
    // A clock a little ahead of the server's is still today.
    ["2026-11-20T12:00:05Z", "Today"],
  ])("%s is %j", (at, label) => {
    expect(lastVisitLabel(at, now)).toBe(label);
  });
});

const USER = "11111111-1111-4111-8111-111111111111";
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

/**
 * A store holding two boards in London, on Wednesday 18 November 2026,
 * counting its calls so the batching shows.
 */
function memoryStore(overrides: Partial<BoardStatusStore> = {}) {
  const calls: string[] = [];
  const weeks: StatusWeek[] = [
    // A: last week is voting, this week is posting.
    {
      id: "a-last",
      venueId: A,
      startsAt: "2026-11-09T04:00:00Z",
      postingEndsAt: "2026-11-16T04:00:00Z",
      votingEndsAt: "2026-11-23T04:00:00Z",
    },
    // B: the week before last closed on Monday, with votes.
    {
      id: "b-closed",
      venueId: B,
      startsAt: "2026-11-02T04:00:00Z",
      postingEndsAt: "2026-11-09T04:00:00Z",
      votingEndsAt: "2026-11-16T04:00:00Z",
    },
    // B: and this week is posting, so November isn't over.
    {
      id: "b-now",
      venueId: B,
      startsAt: "2026-11-16T04:00:00Z",
      postingEndsAt: "2026-11-23T04:00:00Z",
      votingEndsAt: "2026-11-30T04:00:00Z",
    },
  ];
  const store: BoardStatusStore = {
    async listBoards(ids) {
      calls.push("listBoards");
      return ids.map((venueId) => ({
        venueId,
        isPaused: false,
        clock: { timeZone: "Europe/London", change: null },
      }));
    },
    async listWeeks(ids) {
      calls.push("listWeeks");
      return weeks.filter((week) => ids.includes(week.venueId));
    },
    async listPostedDays(_user, _ids, days) {
      calls.push("listPostedDays");
      // B was drawn on today; A wasn't.
      return days.map((localDay) => ({ venueId: B, localDay }));
    },
    async countMyVotes() {
      calls.push("countMyVotes");
      return new Map([["a-last", 1]]);
    },
    async countVotableTiles() {
      calls.push("countVotableTiles");
      return new Map([["a-last", 8]]);
    },
    async listFinals(): Promise<StatusFinal[]> {
      calls.push("listFinals");
      return [];
    },
    async listFinalsVotedIn() {
      calls.push("listFinalsVotedIn");
      return new Set();
    },
    async listWeeksWithVotes(weekIds) {
      calls.push("listWeeksWithVotes");
      return new Set(weekIds);
    },
    async listFinalsWithVotes() {
      calls.push("listFinalsWithVotes");
      return new Set();
    },
    ...overrides,
  };
  return { store, calls };
}

describe("loadBoardStatuses", () => {
  const now = new Date("2026-11-18T12:00:00Z");

  it("works out each board's status from batched reads", async () => {
    const { store, calls } = memoryStore();

    const statuses = await loadBoardStatuses(USER, [A, B], store, now);

    expect(statuses.get(A)).toEqual({
      status: "vote",
      votesLeft: 2,
      revealIds: [],
    });
    // B has nothing to vote on and was drawn on today: its result is news.
    expect(statuses.get(B)).toEqual({
      status: "results",
      revealIds: ["week:b-closed"],
    });
    // Each read once, whatever the number of boards.
    expect(new Set(calls).size).toBe(calls.length);
  });

  it("skips a result nobody voted on: it has nothing to reveal", async () => {
    const { store } = memoryStore({
      listWeeksWithVotes: async () => new Set(),
    });

    const statuses = await loadBoardStatuses(USER, [B], store, now);

    expect(statuses.get(B)?.status).toBeNull();
  });

  it("reads nothing for no boards", async () => {
    const { store, calls } = memoryStore();

    expect((await loadBoardStatuses(USER, [], store, now)).size).toBe(0);
    expect(calls).toEqual([]);
  });

  it("opens the final when a month's last week has finished voting", async () => {
    // October's last week (starting 26 October) votes until 9 November, so
    // October's final runs 9 to 16 November.
    const { store } = memoryStore({
      listWeeks: async () => [
        {
          id: "oct-last",
          venueId: A,
          startsAt: "2026-10-26T04:00:00Z",
          postingEndsAt: "2026-11-02T04:00:00Z",
          votingEndsAt: "2026-11-09T04:00:00Z",
        },
      ],
      listFinals: async (_ids, months) => {
        expect(months).toContain("2026-10-01");
        return [{ id: "final-oct", venueId: A, month: "2026-10-01" }];
      },
    });

    const statuses = await loadBoardStatuses(
      USER,
      [A],
      store,
      new Date("2026-11-12T12:00:00Z"),
    );

    expect(statuses.get(A)?.status).toBe("final");
  });
});
