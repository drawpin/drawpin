/** Where a week is in its cycle, worked out from the clock (ADR-003). */
export type WeekPhase = "upcoming" | "posting" | "voting" | "closed";

export type WeekTimes = {
  startsAt: string | Date;
  postingEndsAt: string | Date;
  votingEndsAt: string | Date;
};

/**
 * The phase a week is in at `now`.
 *
 * Derived rather than stored: nothing runs at 4:00 AM in each venue's time
 * zone to flip a column, so a stored status would be wrong for hours or days
 * (docs/adr/003-on-demand-venue-time-transitions.md).
 *
 * Each boundary belongs to the phase it opens: at exactly `postingEndsAt` the
 * week is voting, not posting.
 */
export function weekPhaseAt(week: WeekTimes, now: Date): WeekPhase {
  const moment = now.getTime();

  if (moment < toTime(week.startsAt)) return "upcoming";
  if (moment < toTime(week.postingEndsAt)) return "posting";
  if (moment < toTime(week.votingEndsAt)) return "voting";
  return "closed";
}

/** True while a week is taking posts. */
export function isTakingPosts(week: WeekTimes, now: Date): boolean {
  return weekPhaseAt(week, now) === "posting";
}

function toTime(value: string | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}
