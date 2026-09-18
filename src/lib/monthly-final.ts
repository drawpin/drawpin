import { finalBoundsFor, monthOfWeek } from "@/lib/venue-time";

/** The timings a week contributes to its month's final. */
export type WeekTiming = { startsAt: string; votingEndsAt: string };

/** A month's final: which month it judges, and when it runs. */
export type FinalWindow = {
  /** First day of the venue-local month, as `YYYY-MM-01`. */
  month: string;
  startsAt: Date;
  endsAt: Date;
};

/**
 * Works out every month's final window from a venue's weeks, newest first.
 *
 * A week belongs to the month its Monday falls in, and a month's final opens
 * when the last of its weeks finishes voting — about two weeks into the next
 * month — then runs for a week (docs/PLAN.md, Monthly super winner).
 *
 * Derived rather than scheduled (ADR-003), so a venue that nobody visits for a
 * month still has the right final waiting when someone does.
 */
export function finalWindows(
  weeks: WeekTiming[],
  timeZone: string,
): FinalWindow[] {
  const lastVotingEndsAt = new Map<string, Date>();

  for (const week of weeks) {
    const month = monthOfWeek(new Date(week.startsAt), timeZone);
    const endsAt = new Date(week.votingEndsAt);
    const current = lastVotingEndsAt.get(month);
    if (!current || endsAt > current) lastVotingEndsAt.set(month, endsAt);
  }

  return [...lastVotingEndsAt.entries()]
    .map(([month, votingEndsAt]) => ({
      month,
      ...finalBoundsFor(votingEndsAt, timeZone),
    }))
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
}

/** The final being voted on right now, if any. */
export function openFinal(
  weeks: WeekTiming[],
  timeZone: string,
  now: Date,
): FinalWindow | null {
  return (
    finalWindows(weeks, timeZone).find(
      (window) => now >= window.startsAt && now < window.endsAt,
    ) ?? null
  );
}

/** Finals that have finished, newest first, ready to be judged. */
export function closedFinals(
  weeks: WeekTiming[],
  timeZone: string,
  now: Date,
): FinalWindow[] {
  return finalWindows(weeks, timeZone).filter((window) => now >= window.endsAt);
}
