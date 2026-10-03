import { Temporal } from "temporal-polyfill";

/** Days and weeks roll over at this local hour (docs/PLAN.md, Scope v1). */
const RESET_HOUR = 4;

const MONDAY = 1;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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

export type DayBounds = {
  /** 4:00 AM venue time: the day, and today's join code, begin. */
  startsAt: Date;
  /** The next 4:00 AM: the code expires and a new one is generated. */
  endsAt: Date;
};

/**
 * The boundaries of the venue-local day containing `now`, used as the validity
 * window of the daily join code (docs/PLAN.md, Joining).
 *
 * Found per date rather than by adding 24 hours, so a day that crosses a
 * daylight saving change still runs 4:00 AM to 4:00 AM on the wall clock.
 */
export function dayBoundsFor(now: Date, timeZone: string): DayBounds {
  const today = venueDate(now, timeZone);

  return {
    startsAt: resetMoment(today, timeZone),
    endsAt: resetMoment(today.add({ days: 1 }), timeZone),
  };
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

/** The venue-local month a week belongs to, as `YYYY-MM-01`. */
export function monthOfWeek(startsAt: Date, timeZone: string): string {
  const date = nearMonday(venueDate(startsAt, timeZone));
  return date.with({ day: 1 }).toString();
}

export type FinalBounds = {
  /** Monday 4:00 AM, when the last of the month's weeks finishes voting. */
  startsAt: Date;
  /** The following Monday 4:00 AM. */
  endsAt: Date;
};

/**
 * The one-week window in which a month's finalists are voted on.
 *
 * It opens when the last of that month's weeks finishes voting — about two
 * weeks into the next month — and runs a week (docs/PLAN.md, Monthly super
 * winner). Every boundary in the cycle is a Monday 4:00 AM, so this one is
 * too, found per date rather than by adding 7 × 24 hours.
 *
 * @param lastVotingEndsAt - The latest `voting_ends_at` among the month's weeks.
 */
export function finalBoundsFor(
  lastVotingEndsAt: Date,
  timeZone: string,
): FinalBounds {
  const opensOn = nearMonday(venueDate(lastVotingEndsAt, timeZone));

  return {
    startsAt: lastVotingEndsAt,
    endsAt: resetMoment(opensOn.add({ weeks: 1 }), timeZone),
  };
}

/**
 * The Monday a week boundary belongs to. Every boundary is Monday 4:00 AM in
 * the zone that set it, but after a time zone change (ADR-008) the week that
 * began in the old zone reads as Sunday or Tuesday in the new one. Any real
 * pair of zones is less than a day apart, so a day either side is enough.
 */
function nearMonday(date: Temporal.PlainDate): Temporal.PlainDate {
  if (date.dayOfWeek === 7) return date.add({ days: 1 });
  if (date.dayOfWeek === MONDAY + 1) return date.subtract({ days: 1 });
  return date;
}

/**
 * A board's time zone, and a change to it the owner has scheduled (ADR-008).
 * The change takes over at `change.from`, the end of the posting week it was
 * made in, so no week already under way moves.
 */
export type VenueClock = {
  timeZone: string;
  change: { timeZone: string; from: Date } | null;
};

/** The venue columns a {@link VenueClock} is stored in. */
export type VenueClockRow = {
  timezone: string;
  next_timezone: string | null;
  timezone_changes_at: string | null;
};

/** The columns to select for {@link clockFromRow}. */
export const VENUE_CLOCK_COLUMNS =
  "timezone, next_timezone, timezone_changes_at";

/** Reads a board's clock from its venue row. */
export function clockFromRow(row: VenueClockRow): VenueClock {
  return {
    timeZone: row.timezone,
    change:
      row.next_timezone && row.timezone_changes_at
        ? {
            timeZone: row.next_timezone,
            from: new Date(row.timezone_changes_at),
          }
        : null,
  };
}

/** The time zone in force at `now`. */
export function zoneAt(clock: VenueClock, now: Date): string {
  return clock.change && now >= clock.change.from
    ? clock.change.timeZone
    : clock.timeZone;
}

/**
 * When the first week in the new zone stops taking posts: the new zone's
 * Monday 4:00 AM closest to a week after the change. That week starts at the
 * change, in step with the old zone, and ends in step with the new one, so it
 * runs a little over or under seven days and no week overlaps another or is
 * skipped.
 */
export function firstWeekEnd(change: { timeZone: string; from: Date }): Date {
  const target = change.from.getTime() + WEEK_MS;
  const day = venueDate(new Date(target), change.timeZone);
  const before = day.subtract({ days: day.dayOfWeek - MONDAY });

  const candidates = [before, before.add({ weeks: 1 })].map((monday) =>
    resetMoment(monday, change.timeZone),
  );
  return candidates.reduce((best, candidate) =>
    Math.abs(candidate.getTime() - target) < Math.abs(best.getTime() - target)
      ? candidate
      : best,
  );
}

/**
 * {@link weekBoundsFor}, for a board whose time zone may be changing. Around
 * a change:
 * - the week the change was made in votes until the first new-zone week
 *   stops taking posts, so two weeks are never open for voting at once;
 * - the first new-zone week runs from the change to {@link firstWeekEnd};
 * - every week after it is an ordinary week in the new zone.
 */
export function weekBoundsAt(now: Date, clock: VenueClock): WeekBounds {
  const { change } = clock;
  if (!change) return weekBoundsFor(now, clock.timeZone);

  const end = firstWeekEnd(change);
  if (now < change.from) {
    const bounds = weekBoundsFor(now, clock.timeZone);
    return bounds.postingEndsAt.getTime() === change.from.getTime()
      ? { ...bounds, votingEndsAt: end }
      : bounds;
  }
  if (now < end) {
    return {
      startsAt: change.from,
      postingEndsAt: end,
      votingEndsAt: weekBoundsFor(end, change.timeZone).postingEndsAt,
    };
  }
  return weekBoundsFor(now, change.timeZone);
}

/**
 * {@link dayBoundsFor}, for a board whose time zone may be changing. The
 * first new-zone day starts at the change rather than at its own 4:00 AM,
 * which could be before it, so two days' join codes never overlap.
 */
export function dayBoundsAt(now: Date, clock: VenueClock): DayBounds {
  const zone = zoneAt(clock, now);
  const bounds = dayBoundsFor(now, zone);
  if (!clock.change || now < clock.change.from) return bounds;

  return bounds.startsAt < clock.change.from
    ? { ...bounds, startsAt: clock.change.from }
    : bounds;
}

/** What changing a board's time zone to a new one does (ADR-008). */
export type TimeZoneChangePlan =
  | {
      status: "scheduled" | "cancelled";
      /** The board's clock to store. */
      clock: VenueClock;
      /** The week taking posts now, which is the one whose voting moves. */
      week: { postingEndsAt: Date; votingEndsAt: Date };
    }
  | { status: "unchanged" }
  /** A change is under way; another can be made once its first week ends. */
  | { status: "settling"; until: Date };

/**
 * Works out how a board's clock changes when the owner picks `nextZone`.
 *
 * The new zone takes over when the current posting week ends. Before then,
 * picking again replaces the scheduled change, and picking the zone in force
 * cancels it. While the first new-zone week is running there's nothing safe
 * to move, so a further change waits until it ends.
 */
export function planTimeZoneChange(
  now: Date,
  clock: VenueClock,
  nextZone: string,
): TimeZoneChangePlan {
  const { change } = clock;
  if (change && now >= change.from) {
    const end = firstWeekEnd(change);
    if (now < end) return { status: "settling", until: end };
  }

  // Once a change has fully taken over, its zone is simply the board's zone.
  const zone = change && now >= change.from ? change.timeZone : clock.timeZone;
  const pending = change && now < change.from ? change : null;
  const current = weekBoundsFor(now, zone);

  if (nextZone === zone) {
    if (!pending) return { status: "unchanged" };
    return {
      status: "cancelled",
      clock: { timeZone: zone, change: null },
      week: {
        postingEndsAt: current.postingEndsAt,
        votingEndsAt: current.votingEndsAt,
      },
    };
  }

  if (pending?.timeZone === nextZone) return { status: "unchanged" };

  const next = { timeZone: nextZone, from: current.postingEndsAt };
  return {
    status: "scheduled",
    clock: { timeZone: zone, change: next },
    week: { postingEndsAt: next.from, votingEndsAt: firstWeekEnd(next) },
  };
}

/**
 * A week or day boundary as an owner reads it, in the zone it falls in, e.g.
 * "Monday 12 October, 4:00 AM".
 */
export function formatBoundary(moment: Date, timeZone: string): string {
  const date = moment.toLocaleDateString("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const time = moment.toLocaleTimeString("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

/** What the owner screen says about a board's time zone. */
export type ClockStatus = {
  /** The zone in force now. */
  timeZone: string;
  /** A change that hasn't taken over yet. */
  scheduled: { timeZone: string; from: Date } | null;
  /** While a change's first week runs, when another can be made. */
  settlingUntil: Date | null;
  /** When a change made now would take over. */
  nextChangeFrom: Date;
};

/** Sums up a board's clock for the owner screen. */
export function clockStatus(now: Date, clock: VenueClock): ClockStatus {
  const timeZone = zoneAt(clock, now);
  const { change } = clock;
  const scheduled = change && now < change.from ? change : null;
  const end = change && !scheduled ? firstWeekEnd(change) : null;
  const settlingUntil = end && now < end ? end : null;

  return {
    timeZone,
    scheduled,
    settlingUntil,
    nextChangeFrom: weekBoundsFor(now, scheduled ? clock.timeZone : timeZone)
      .postingEndsAt,
  };
}
