# ADR-003: On-Demand Venue-Time Transitions Instead of an Hourly Cron

## Status
Accepted

## Context
`docs/PLAN.md` (v5) scheduled the time-based work on a Vercel Cron job running
**hourly**: rotating each venue's daily join code, rolling weeks over from
posting to voting to closed, finalizing each week's Hall of Fame, and the
30-day cleanup. It had to be hourly because every venue resets at 4:00 AM in
its *own* time zone, so a job has to keep checking which venues just crossed
that line.

The project runs on Vercel's Hobby plan, where cron jobs are limited to **once
per day** (and two jobs total, each firing anytime within its scheduled hour).
An hourly schedule fails to deploy. See
[Vercel cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Most of that work also doesn't need to happen at 4:00 AM exactly; it needs to
be correct by the time someone looks. Weeks already work this way: the first
tile posted in a week creates its `weeks` row (issue #8).

## Decision
Do venue-time transitions **on demand**, when the result is first needed, and
keep a single **daily** Vercel Cron job for work that isn't time-sensitive.

| Work | When it happens |
|---|---|
| New week | Created by the first post of the week (already the case) |
| Week status (posting / voting / closed) | Derived from the week's `posting_ends_at` and `voting_ends_at` whenever it's read, not switched by a job |
| Daily join code | Created the first time the owner's admin page asks for today's code; customers only learn the code from that screen, so it always exists before anyone types it |
| Hall of Fame | Finalized the first time a closed week's results are requested, idempotently |
| 30-day cleanup | Daily Vercel Cron job |

Each on-demand step must be **idempotent and race-safe** — two requests at the
same moment must produce one week, one code, one Hall of Fame — using unique
constraints and insert-or-read patterns like the existing `ensurePostingWeek`.

## Rationale
- Fits the free Hobby plan with no paid upgrade or extra scheduler service.
- Correct at the exact local 4:00 AM boundary for every time zone, instead of
  up to an hour late (or later, given Vercel's within-the-hour firing window).
- No background job to monitor, retry, or leave half-finished; a failed step is
  simply retried by the next request.
- Consistent with how weeks already work.

## Consequences
- Code that reads week state must compute status from timestamps rather than
  trusting a stored `status` column; the column should be treated as derived or
  removed when the weekly cycle is built (phase 3).
- The first request after a boundary does a little extra work (e.g. inserting a
  code or finalizing a Hall of Fame). That's small and happens once.
- Nothing happens for a venue nobody visits. That's fine: there's nobody to see
  it, and the next visit catches up.
- The 30-day cleanup can run up to a day late. Deletion isn't time-sensitive.
