# ADR-002: Frontend Tooling

## Status
Accepted

## Context
`CLAUDE.md` decided the core app framework (Next.js + TypeScript) and backend
(Supabase) up front, but left linting/formatting, unit testing, end-to-end
testing, UI/styling, and validation as "not yet decided," to be settled via
an ADR before scaffolding (issue #3). DrawPin is a mobile-only, canvas-heavy,
form-light app, so the priorities are: fast mobile-viewport feedback, low
config overhead, and strong typing all the way to runtime validation of
network input.

## Decision
- **UI/styling**: Tailwind CSS + shadcn/ui. Utility-first styling avoids a
  separate CSS architecture, and shadcn/ui components are copied into the
  repo (not an installed dependency), so they stay easy to restyle for the
  drawing-board UI without fighting a component library's API.
- **Linting/formatting**: ESLint (`eslint-config-next`) + Prettier
  (`prettier-plugin-tailwindcss` for class sorting), with
  `eslint-config-prettier` disabling stylistic ESLint rules so the two tools
  never disagree.
- **Unit tests**: Vitest, run in a `jsdom` environment via
  `@vitejs/plugin-react`. Chosen over Jest for native ESM/TypeScript support
  and faster startup, matching the Vite-family tooling Next.js's own tooling
  is converging on.
- **End-to-end tests**: Playwright, configured with a single "Mobile Chrome"
  project (`Pixel 5` device profile) since the product is mobile-only —
  there is no desktop layout to cover.
- **Validation**: Zod, for parsing/validating request bodies, query params,
  and environment variables at runtime with types inferred from the same
  schema.

## Rationale
- All four tools are TypeScript-first and integrate with each other with
  minimal glue (e.g. Vitest reuses the app's Vite/React setup; Zod schemas
  double as TypeScript types for API route handlers).
- Copying shadcn/ui components avoids a hard dependency on a third-party
  component library's release cadence and lets components be trimmed to only
  what a QR-code drawing board needs.
- A single mobile Playwright project matches the actual supported surface
  (phones only, per `docs/PLAN.md`) instead of paying for desktop browser
  coverage nobody uses.

## Consequences
- New UI work adds shadcn/ui components via its CLI and then owns the copied
  source — upstream fixes must be pulled in manually, not via `npm update`.
- E2E coverage only exercises the mobile viewport; a desktop-specific bug
  would not be caught by CI.
- All external input (API routes, env vars) should be parsed through a Zod
  schema rather than cast, per the code-documentation skill's "validated"
  requirement.
