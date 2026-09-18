import { describe, expect, it } from "vitest";
import { dayBoundsFor, localDayFor, weekBoundsFor } from "./venue-time";

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
