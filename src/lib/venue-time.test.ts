import { describe, expect, it } from "vitest";
import {
  clockStatus,
  dayBoundsAt,
  dayBoundsFor,
  finalBoundsFor,
  firstWeekEnd,
  formatBoundary,
  localDayFor,
  monthOfWeek,
  planTimeZoneChange,
  type VenueClock,
  weekBoundsAt,
  weekBoundsFor,
  zoneAt,
} from "./venue-time";

const at = (iso: string) => new Date(iso);
const iso = (date: Date) => date.toISOString();

describe("localDayFor", () => {
  it("uses the venue's calendar date after 4:00 AM", () => {
    // 10:00 AM in Chicago (CDT, UTC-5).
    expect(localDayFor(at("2026-09-16T15:00:00Z"), "America/Chicago")).toBe(
      "2026-09-16",
    );
  });

  it("counts the small hours as the previous day", () => {
    // 3:59 AM Thursday in Chicago still belongs to Wednesday.
    expect(localDayFor(at("2026-09-17T08:59:00Z"), "America/Chicago")).toBe(
      "2026-09-16",
    );
    // 4:00 AM exactly starts Thursday.
    expect(localDayFor(at("2026-09-17T09:00:00Z"), "America/Chicago")).toBe(
      "2026-09-17",
    );
  });

  it("uses the venue's zone, not UTC", () => {
    // Same instant: already the 17th in Tokyo, still the 16th in Chicago.
    const instant = at("2026-09-16T23:00:00Z");
    expect(localDayFor(instant, "Asia/Tokyo")).toBe("2026-09-17");
    expect(localDayFor(instant, "America/Chicago")).toBe("2026-09-16");
  });
});

describe("weekBoundsFor", () => {
  it("runs Monday 4:00 AM to Monday 4:00 AM, then a voting week", () => {
    // Wednesday 2026-09-16, Chicago (CDT, UTC-5).
    expect(
      weekBoundsFor(at("2026-09-16T15:00:00Z"), "America/Chicago"),
    ).toEqual({
      startsAt: at("2026-09-14T09:00:00Z"),
      postingEndsAt: at("2026-09-21T09:00:00Z"),
      votingEndsAt: at("2026-09-28T09:00:00Z"),
    });
  });

  it("treats Monday before 4:00 AM as the end of the previous week", () => {
    // Monday 2026-09-21 at 3:00 AM Chicago.
    const bounds = weekBoundsFor(at("2026-09-21T08:00:00Z"), "America/Chicago");
    expect(iso(bounds.startsAt)).toBe("2026-09-14T09:00:00.000Z");
  });

  it("starts a new week at Monday 4:00 AM exactly", () => {
    const bounds = weekBoundsFor(at("2026-09-21T09:00:00Z"), "America/Chicago");
    expect(iso(bounds.startsAt)).toBe("2026-09-21T09:00:00.000Z");
  });

  it("includes late Sunday night in the week that started the previous Monday", () => {
    // Sunday 2026-09-20 at 11:30 PM Chicago.
    const bounds = weekBoundsFor(at("2026-09-21T04:30:00Z"), "America/Chicago");
    expect(iso(bounds.startsAt)).toBe("2026-09-14T09:00:00.000Z");
  });

  it("keeps 4:00 AM local across a spring-forward week (167 hours)", () => {
    // US DST starts Sunday 2026-03-08: Monday 3/2 is CST (UTC-6), 3/9 is CDT.
    const bounds = weekBoundsFor(at("2026-03-04T18:00:00Z"), "America/Chicago");
    expect(iso(bounds.startsAt)).toBe("2026-03-02T10:00:00.000Z");
    expect(iso(bounds.postingEndsAt)).toBe("2026-03-09T09:00:00.000Z");
    const hours =
      (bounds.postingEndsAt.getTime() - bounds.startsAt.getTime()) / 3_600_000;
    expect(hours).toBe(167);
  });

  it("keeps 4:00 AM local across a fall-back week (169 hours)", () => {
    // US DST ends Sunday 2026-11-01: Monday 10/26 is CDT, 11/2 is CST.
    const bounds = weekBoundsFor(at("2026-10-28T18:00:00Z"), "America/Chicago");
    expect(iso(bounds.startsAt)).toBe("2026-10-26T09:00:00.000Z");
    expect(iso(bounds.postingEndsAt)).toBe("2026-11-02T10:00:00.000Z");
  });

  it("handles half-hour offsets", () => {
    // Asia/Kolkata is UTC+5:30, so Monday 4:00 AM is Sunday 22:30 UTC.
    const bounds = weekBoundsFor(at("2026-09-16T12:00:00Z"), "Asia/Kolkata");
    expect(iso(bounds.startsAt)).toBe("2026-09-13T22:30:00.000Z");
  });

  it("handles zones far ahead of UTC", () => {
    // Pacific/Kiritimati is UTC+14: Monday 4:00 AM is Sunday 14:00 UTC.
    const bounds = weekBoundsFor(
      at("2026-09-16T12:00:00Z"),
      "Pacific/Kiritimati",
    );
    expect(iso(bounds.startsAt)).toBe("2026-09-13T14:00:00.000Z");
  });
});

describe("dayBoundsFor", () => {
  it("runs 4:00 AM to 4:00 AM venue time", () => {
    // Wednesday 10:00 AM in Chicago (CDT, UTC-5).
    expect(dayBoundsFor(at("2026-09-16T15:00:00Z"), "America/Chicago")).toEqual(
      {
        startsAt: at("2026-09-16T09:00:00Z"),
        endsAt: at("2026-09-17T09:00:00Z"),
      },
    );
  });

  it("keeps the small hours on the previous day's code", () => {
    // 2:00 AM Thursday still belongs to Wednesday's window.
    expect(dayBoundsFor(at("2026-09-17T07:00:00Z"), "America/Chicago")).toEqual(
      {
        startsAt: at("2026-09-16T09:00:00Z"),
        endsAt: at("2026-09-17T09:00:00Z"),
      },
    );
  });

  it("stays at 4:00 AM across a daylight saving change", () => {
    // Saturday 2026-10-31, the day US clocks go back overnight: 4:00 AM is
    // CDT at the start and CST at the end, so the day runs 25 hours.
    const bounds = dayBoundsFor(at("2026-10-31T18:00:00Z"), "America/Chicago");

    expect(iso(bounds.startsAt)).toBe("2026-10-31T09:00:00.000Z");
    expect(iso(bounds.endsAt)).toBe("2026-11-01T10:00:00.000Z");
  });
});

describe("monthOfWeek", () => {
  it("uses the month the week's Monday falls in", () => {
    // Monday 2026-09-28 4:00 AM Chicago: a week that runs into October.
    expect(monthOfWeek(at("2026-09-28T09:00:00Z"), "America/Chicago")).toBe(
      "2026-09-01",
    );
  });

  it("uses venue time, not UTC", () => {
    // Monday 2026-10-05 00:30 Chicago is already the 5th there, but the 5th
    // at 05:30 UTC — the same month either way; this one isn't.
    // 2026-11-01 03:00 Chicago is still Saturday the 31st of October by the
    // 4:00 AM rule, so the week belongs to October.
    expect(monthOfWeek(at("2026-11-01T08:00:00Z"), "America/Chicago")).toBe(
      "2026-10-01",
    );
  });
});

describe("finalBoundsFor", () => {
  it("runs the week after the month's last voting ends", () => {
    const bounds = finalBoundsFor(
      at("2026-10-12T09:00:00Z"),
      "America/Chicago",
    );

    expect(iso(bounds.startsAt)).toBe("2026-10-12T09:00:00.000Z");
    expect(iso(bounds.endsAt)).toBe("2026-10-19T09:00:00.000Z");
  });

  it("stays at 4:00 AM across a daylight saving change", () => {
    // The final that opens the Monday before US clocks go back.
    const bounds = finalBoundsFor(
      at("2026-10-26T09:00:00Z"),
      "America/Chicago",
    );

    // CDT to CST, so the week is 169 hours and still ends at 4:00 AM local.
    expect(iso(bounds.endsAt)).toBe("2026-11-02T10:00:00.000Z");
  });
});

// A board in Chicago (CDT, UTC-5). Its week of Monday 2026-09-28 stops taking
// posts at Monday 2026-10-05 4:00 AM Chicago, 09:00 UTC: when a change made
// during that week takes over.
const CHICAGO = "America/Chicago";
const changeTo = (timeZone: string): VenueClock => ({
  timeZone: CHICAGO,
  change: { timeZone, from: at("2026-10-05T09:00:00Z") },
});

describe("monthOfWeek after a time zone change", () => {
  it("keeps a week that began in the old zone on its Monday", () => {
    // Monday 2026-11-02 4:00 AM Chicago (CST) is 2:00 AM, still Sunday by the
    // 4:00 AM rule, in Los Angeles. The week still belongs to November.
    expect(monthOfWeek(at("2026-11-02T10:00:00Z"), "America/Los_Angeles")).toBe(
      "2026-11-01",
    );
  });
});

describe("zoneAt", () => {
  it("switches zone when the change takes over", () => {
    const clock = changeTo("Asia/Tokyo");
    expect(zoneAt(clock, at("2026-10-05T08:59:59Z"))).toBe(CHICAGO);
    expect(zoneAt(clock, at("2026-10-05T09:00:00Z"))).toBe("Asia/Tokyo");
  });

  it("is the board's zone when nothing is changing", () => {
    expect(zoneAt({ timeZone: CHICAGO, change: null }, new Date())).toBe(
      CHICAGO,
    );
  });
});

describe("firstWeekEnd", () => {
  it("ends a zone ahead at the new Monday just under a week on", () => {
    // Monday 2026-10-12 4:00 AM in Tokyo: 6 days 10 hours after the change.
    expect(iso(firstWeekEnd(changeTo("Asia/Tokyo").change!))).toBe(
      "2026-10-11T19:00:00.000Z",
    );
  });

  it("ends a zone behind at the new Monday just over a week on", () => {
    // Monday 2026-10-12 4:00 AM in Los Angeles: 7 days 2 hours, not the
    // 2-hour week that ending at the first Monday after the change would be.
    expect(iso(firstWeekEnd(changeTo("America/Los_Angeles").change!))).toBe(
      "2026-10-12T11:00:00.000Z",
    );
  });
});

describe("weekBoundsAt", () => {
  it("is weekBoundsFor when nothing is changing", () => {
    const now = at("2026-09-30T15:00:00Z");
    expect(weekBoundsAt(now, { timeZone: CHICAGO, change: null })).toEqual(
      weekBoundsFor(now, CHICAGO),
    );
  });

  it("lets the week the change was made in vote until the first new week ends", () => {
    const bounds = weekBoundsAt(
      at("2026-09-30T15:00:00Z"),
      changeTo("Asia/Tokyo"),
    );

    expect(iso(bounds.startsAt)).toBe("2026-09-28T09:00:00.000Z");
    expect(iso(bounds.postingEndsAt)).toBe("2026-10-05T09:00:00.000Z");
    expect(iso(bounds.votingEndsAt)).toBe("2026-10-11T19:00:00.000Z");
  });

  it("runs the first new week from the change to the new zone's Monday", () => {
    const bounds = weekBoundsAt(
      at("2026-10-07T00:00:00Z"),
      changeTo("Asia/Tokyo"),
    );

    expect(iso(bounds.startsAt)).toBe("2026-10-05T09:00:00.000Z");
    expect(iso(bounds.postingEndsAt)).toBe("2026-10-11T19:00:00.000Z");
    expect(iso(bounds.votingEndsAt)).toBe("2026-10-18T19:00:00.000Z");
  });

  it("starts the first new week at the change, not at the new zone's earlier Monday", () => {
    // Just after the change, Tokyo's own week began ten hours before it.
    const bounds = weekBoundsAt(
      at("2026-10-05T09:00:00Z"),
      changeTo("Asia/Tokyo"),
    );
    expect(iso(bounds.startsAt)).toBe("2026-10-05T09:00:00.000Z");
  });

  it("covers the hours a zone behind is still in its own old week", () => {
    // 3:00 AM Monday in Los Angeles: its own week hasn't turned over yet.
    const bounds = weekBoundsAt(
      at("2026-10-05T10:00:00Z"),
      changeTo("America/Los_Angeles"),
    );

    expect(iso(bounds.startsAt)).toBe("2026-10-05T09:00:00.000Z");
    expect(iso(bounds.postingEndsAt)).toBe("2026-10-12T11:00:00.000Z");
  });

  it("follows the new zone once its first week is over", () => {
    const now = at("2026-10-14T00:00:00Z");
    const bounds = weekBoundsAt(now, changeTo("Asia/Tokyo"));

    expect(bounds).toEqual(weekBoundsFor(now, "Asia/Tokyo"));
    // Picks up exactly where the first new week stopped.
    expect(iso(bounds.startsAt)).toBe("2026-10-11T19:00:00.000Z");
  });

  it("leaves weeks before the change alone", () => {
    const now = at("2026-09-22T15:00:00Z");
    expect(weekBoundsAt(now, changeTo("Asia/Tokyo"))).toEqual(
      weekBoundsFor(now, CHICAGO),
    );
  });
});

describe("dayBoundsAt", () => {
  it("starts the first new day at the change, not before it", () => {
    // 7:00 PM in Tokyo: its day began at 4:00 AM, nine hours before the change.
    const bounds = dayBoundsAt(
      at("2026-10-05T10:00:00Z"),
      changeTo("Asia/Tokyo"),
    );

    expect(iso(bounds.startsAt)).toBe("2026-10-05T09:00:00.000Z");
    expect(iso(bounds.endsAt)).toBe("2026-10-05T19:00:00.000Z");
  });

  it("uses the old zone before the change and the new one after", () => {
    const clock = changeTo("Asia/Tokyo");
    const before = at("2026-10-01T15:00:00Z");
    const after = at("2026-10-07T15:00:00Z");

    expect(dayBoundsAt(before, clock)).toEqual(dayBoundsFor(before, CHICAGO));
    expect(dayBoundsAt(after, clock)).toEqual(
      dayBoundsFor(after, "Asia/Tokyo"),
    );
  });
});

describe("planTimeZoneChange", () => {
  const wednesday = at("2026-09-30T15:00:00Z");
  const settled: VenueClock = { timeZone: CHICAGO, change: null };

  it("schedules the change for the end of this posting week", () => {
    expect(planTimeZoneChange(wednesday, settled, "Asia/Tokyo")).toEqual({
      status: "scheduled",
      clock: changeTo("Asia/Tokyo"),
      week: {
        postingEndsAt: at("2026-10-05T09:00:00Z"),
        votingEndsAt: at("2026-10-11T19:00:00Z"),
      },
    });
  });

  it("replaces a change that hasn't taken over yet", () => {
    expect(
      planTimeZoneChange(
        wednesday,
        changeTo("Asia/Tokyo"),
        "America/Los_Angeles",
      ),
    ).toMatchObject({
      status: "scheduled",
      clock: changeTo("America/Los_Angeles"),
      week: { votingEndsAt: at("2026-10-12T11:00:00Z") },
    });
  });

  it("cancels a scheduled change and puts this week's voting back", () => {
    expect(
      planTimeZoneChange(wednesday, changeTo("Asia/Tokyo"), CHICAGO),
    ).toEqual({
      status: "cancelled",
      clock: settled,
      week: {
        postingEndsAt: at("2026-10-05T09:00:00Z"),
        votingEndsAt: at("2026-10-12T09:00:00Z"),
      },
    });
  });

  it("does nothing when the zone picked is already the one in force or scheduled", () => {
    expect(planTimeZoneChange(wednesday, settled, CHICAGO)).toEqual({
      status: "unchanged",
    });
    expect(
      planTimeZoneChange(wednesday, changeTo("Asia/Tokyo"), "Asia/Tokyo"),
    ).toEqual({ status: "unchanged" });
  });

  it("waits while the first new week is running", () => {
    expect(
      planTimeZoneChange(
        at("2026-10-07T00:00:00Z"),
        changeTo("Asia/Tokyo"),
        "Europe/London",
      ),
    ).toEqual({ status: "settling", until: at("2026-10-11T19:00:00Z") });
  });

  it("treats a change that has fully taken over as the board's zone", () => {
    const now = at("2026-10-14T00:00:00Z");

    expect(
      planTimeZoneChange(now, changeTo("Asia/Tokyo"), CHICAGO),
    ).toMatchObject({
      status: "scheduled",
      clock: {
        timeZone: "Asia/Tokyo",
        change: {
          timeZone: CHICAGO,
          from: weekBoundsFor(now, "Asia/Tokyo").postingEndsAt,
        },
      },
    });
  });
});

describe("clockStatus", () => {
  it("reports a scheduled change and when another would take over", () => {
    const status = clockStatus(
      at("2026-09-30T15:00:00Z"),
      changeTo("Asia/Tokyo"),
    );

    expect(status).toEqual({
      timeZone: CHICAGO,
      scheduled: { timeZone: "Asia/Tokyo", from: at("2026-10-05T09:00:00Z") },
      settlingUntil: null,
      nextChangeFrom: at("2026-10-05T09:00:00Z"),
    });
  });

  it("reports a change still taking effect", () => {
    const status = clockStatus(
      at("2026-10-07T00:00:00Z"),
      changeTo("Asia/Tokyo"),
    );

    expect(status.timeZone).toBe("Asia/Tokyo");
    expect(status.scheduled).toBeNull();
    expect(status.settlingUntil).toEqual(at("2026-10-11T19:00:00Z"));
  });

  it("reports a settled board", () => {
    const status = clockStatus(
      at("2026-10-14T00:00:00Z"),
      changeTo("Asia/Tokyo"),
    );

    expect(status.settlingUntil).toBeNull();
    expect(status.nextChangeFrom).toEqual(at("2026-10-18T19:00:00Z"));
  });
});

describe("formatBoundary", () => {
  it("reads in the zone the boundary falls in", () => {
    expect(formatBoundary(at("2026-10-05T09:00:00Z"), CHICAGO)).toBe(
      "Monday 5 October, 4:00 AM",
    );
  });
});
