// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  closedFinals,
  finalWindows,
  openFinal,
  type WeekTiming,
} from "./monthly-final";

const ZONE = "America/Chicago";
const at = (iso: string) => new Date(iso);

/** A week starting the Monday given, 4:00 AM Chicago, voting two weeks later. */
const week = (mondayIso: string): WeekTiming => {
  const startsAt = new Date(mondayIso);
  const votingEndsAt = new Date(startsAt);
  votingEndsAt.setUTCDate(votingEndsAt.getUTCDate() + 14);
  return {
    startsAt: startsAt.toISOString(),
    votingEndsAt: votingEndsAt.toISOString(),
  };
};

// September 2026's Mondays, 4:00 AM Chicago (CDT, UTC-5).
const september = [
  week("2026-08-31T09:00:00Z"),
  week("2026-09-07T09:00:00Z"),
  week("2026-09-14T09:00:00Z"),
  week("2026-09-21T09:00:00Z"),
  week("2026-09-28T09:00:00Z"),
];

describe("finalWindows", () => {
  it("opens when the month's last week finishes voting", () => {
    const [latest] = finalWindows(september, ZONE);

    // The 28th's week votes until 12 October, so the final runs that week.
    expect(latest.month).toBe("2026-09-01");
    expect(latest.startsAt.toISOString()).toBe("2026-10-12T09:00:00.000Z");
    expect(latest.endsAt.toISOString()).toBe("2026-10-19T09:00:00.000Z");
  });

  it("puts a week in the month its Monday falls in", () => {
    // 31 August starts a week running into September; it judges August.
    const months = finalWindows(september, ZONE).map((w) => w.month);

    expect(months).toContain("2026-08-01");
    expect(months).toContain("2026-09-01");
  });

  it("returns newest first", () => {
    const windows = finalWindows(september, ZONE);

    expect(windows.map((w) => w.month)).toEqual(["2026-09-01", "2026-08-01"]);
  });

  it("has nothing to say about a venue with no weeks", () => {
    expect(finalWindows([], ZONE)).toEqual([]);
  });
});

describe("openFinal", () => {
  it("finds the final being voted on right now", () => {
    const open = openFinal(september, ZONE, at("2026-10-14T12:00:00Z"));

    expect(open?.month).toBe("2026-09-01");
  });

  it("includes the moment it opens and excludes the moment it closes", () => {
    expect(
      openFinal(september, ZONE, at("2026-10-12T09:00:00Z")),
    ).not.toBeNull();
    expect(openFinal(september, ZONE, at("2026-10-19T09:00:00Z"))).toBeNull();
  });

  it("is nothing between finals", () => {
    expect(openFinal(september, ZONE, at("2026-10-05T12:00:00Z"))).toBeNull();
  });
});

describe("closedFinals", () => {
  it("lists the finals that have finished", () => {
    const closed = closedFinals(september, ZONE, at("2026-10-20T12:00:00Z"));

    expect(closed.map((w) => w.month)).toEqual(["2026-09-01", "2026-08-01"]);
  });

  it("leaves out one still being voted on", () => {
    const closed = closedFinals(september, ZONE, at("2026-10-14T12:00:00Z"));

    expect(closed.map((w) => w.month)).toEqual(["2026-08-01"]);
  });
});
