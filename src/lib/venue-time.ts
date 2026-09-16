import { Temporal } from "temporal-polyfill";

/** Days and weeks roll over at this local hour (docs/PLAN.md, Scope v1). */
export const RESET_HOUR = 4;

const MONDAY = 1;

/**
 * The venue-local calendar date a moment belongs to, where each day runs from
 * 4:00 AM to 4:00 AM. Posting at 1:30 AM on Tuesday still counts as Monday.
 *
 * @param now - The moment to classify.
 * @param timeZone - The venue's IANA time zone.
 * @returns The day as `YYYY-MM-DD`, for `post_attempts.local_day`.
 */
export function localDayFor(now: Date, timeZone: string): string {
  return venueDate(now, timeZone).toString();
}

export type WeekBounds = {
  /** Monday 4:00 AM venue time: posting opens. */
  startsAt: Date;
  /** The following Monday 4:00 AM: posting closes and voting opens. */
  postingEndsAt: Date;
  /** The Monday after that, 4:00 AM: voting closes. */
  votingEndsAt: Date;
};

/**
 * The boundaries of the weekly cycle whose posting week contains `now`.
 *
 * Each boundary is Monday 4:00 AM *local* time, found per date rather than by
 * adding 7 × 24 hours, so a week that crosses a daylight saving change is 167
 * or 169 hours long and still starts and ends at 4:00 AM on the wall clock.
 */
export function weekBoundsFor(now: Date, timeZone: string): WeekBounds {
  const today = venueDate(now, timeZone);
  const monday = today.subtract({ days: today.dayOfWeek - MONDAY });

  return {
    startsAt: resetMoment(monday, timeZone),
    postingEndsAt: resetMoment(monday.add({ weeks: 1 }), timeZone),
    votingEndsAt: resetMoment(monday.add({ weeks: 2 }), timeZone),
  };
}

function venueDate(now: Date, timeZone: string): Temporal.PlainDate {
  const local = Temporal.Instant.fromEpochMilliseconds(
    now.getTime(),
  ).toZonedDateTimeISO(timeZone);
  const date = local.toPlainDate();
  return local.hour < RESET_HOUR ? date.subtract({ days: 1 }) : date;
}

function resetMoment(date: Temporal.PlainDate, timeZone: string): Date {
  // "compatible" moves a reset that falls in a DST gap to just after the gap,
  // the same way a wall clock would read it.
  const zoned = date.toZonedDateTime({
    timeZone,
    plainTime: new Temporal.PlainTime(RESET_HOUR),
  });
  return new Date(zoned.epochMilliseconds);
}
