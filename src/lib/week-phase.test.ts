// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isTakingPosts, weekPhaseAt, type WeekTimes } from "./week-phase";

// Monday 4:00 AM Chicago (CDT) three weeks running.
const week: WeekTimes = {
  startsAt: "2026-09-14T09:00:00Z",
  postingEndsAt: "2026-09-21T09:00:00Z",
  votingEndsAt: "2026-09-28T09:00:00Z",
};

const at = (iso: string) => new Date(iso);

describe("weekPhaseAt", () => {
  it("is upcoming before it starts", () => {
    expect(weekPhaseAt(week, at("2026-09-14T08:59:59Z"))).toBe("upcoming");
  });

  it("takes posts from its first moment", () => {
    expect(weekPhaseAt(week, at("2026-09-14T09:00:00Z"))).toBe("posting");
    expect(weekPhaseAt(week, at("2026-09-17T15:00:00Z"))).toBe("posting");
  });

  it("switches to voting exactly when posting ends", () => {
    expect(weekPhaseAt(week, at("2026-09-21T08:59:59Z"))).toBe("posting");
    // 4:00 AM belongs to the phase it opens.
    expect(weekPhaseAt(week, at("2026-09-21T09:00:00Z"))).toBe("voting");
  });

  it("closes exactly when voting ends", () => {
    expect(weekPhaseAt(week, at("2026-09-28T08:59:59Z"))).toBe("voting");
    expect(weekPhaseAt(week, at("2026-09-28T09:00:00Z"))).toBe("closed");
    expect(weekPhaseAt(week, at("2026-12-25T09:00:00Z"))).toBe("closed");
  });

  it("reads Date and timestamp values the same way", () => {
    const asDates: WeekTimes = {
      startsAt: at("2026-09-14T09:00:00Z"),
      postingEndsAt: at("2026-09-21T09:00:00Z"),
      votingEndsAt: at("2026-09-28T09:00:00Z"),
    };

    expect(weekPhaseAt(asDates, at("2026-09-17T15:00:00Z"))).toBe("posting");
  });

  it("reads Postgres' microsecond timestamps", () => {
    const row: WeekTimes = {
      startsAt: "2026-09-14 09:00:00.123456+00",
      postingEndsAt: "2026-09-21 09:00:00.123456+00",
      votingEndsAt: "2026-09-28 09:00:00.123456+00",
    };

    expect(weekPhaseAt(row, at("2026-09-17T15:00:00Z"))).toBe("posting");
  });
});

describe("isTakingPosts", () => {
  it("is true only during the posting week", () => {
    expect(isTakingPosts(week, at("2026-09-17T15:00:00Z"))).toBe(true);
    expect(isTakingPosts(week, at("2026-09-22T15:00:00Z"))).toBe(false);
    expect(isTakingPosts(week, at("2026-09-13T15:00:00Z"))).toBe(false);
  });
});
