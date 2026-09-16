# ADR-001: Trunk-Based Branching

## Status
Accepted

## Context
DrawPin is a small, single-owner-at-a-time codebase deployed on Vercel. We need
a branching model that keeps history linear, avoids long-lived integration
branches going stale, and lets every change get a real preview before it
reaches production.

## Decision
Use trunk-based development:

- `main` is the only long-lived branch. It is always deployable and every
  merge to it deploys to production.
- All work happens on short-lived branches cut from `main`, one per issue
  (`type/<issue#>-short-name`).
- Branches merge back via pull request, squash-merged, keeping `main`'s
  history linear (rebase on `main`, no merge commits).
- Every branch and PR gets a Vercel preview deployment; that preview is where
  a change is tested before merge, not a shared `develop` environment.
- There is no `develop`, `staging`, or `release` branch.

## Rationale
- A single trunk avoids merge-branch drift and the overhead of keeping a
  second long-lived branch in sync.
- Short-lived branches keep diffs small and reviewable, matching the "keep
  changes small and scoped to one issue" working agreement.
- Vercel preview deployments give per-PR testing without needing a shared
  staging branch.
- Squash-merging keeps `main` bisectable and keeps the commit log at PR
  granularity.

## Consequences
- Nothing can be merged to `main` without being ready for production; there
  is no intermediate integration branch to stage half-finished work.
- Feature work spanning multiple PRs must be broken into independently
  mergeable, non-breaking increments (e.g. behind conditions that don't
  activate until the full feature lands).
- CI must run on every pull request against `main` (see the `ci` GitHub
  Actions workflow) since there is no later integration-branch check to catch
  problems.
