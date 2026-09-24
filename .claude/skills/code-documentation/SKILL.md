---
name: code-documentation
description: Lightweight code documentation habits for DrawPin — accurate CLAUDE.md setup docs, comments on tricky logic, current .env.example, TSDoc on shared utilities. Use whenever writing or changing code.
---

# Code Documentation

Keep it light. This is a hobby project — the goal is a codebase future you
(or Claude) can pick up quickly, not exhaustive paperwork.

- **README.md is public-facing, not a setup guide.** This repo is public to
  show the project, not to invite contributions or reuse (see License in the
  README) — there is deliberately no CONTRIBUTING.md. The README covers what
  DrawPin is, why it exists, how it works, the system design. It doesn't
  cover installing, running, or configuring the app — that's `CLAUDE.md`'s
  "Local development" section. Don't add dev/setup content back into the
  README.
- **`CLAUDE.md`'s quick start stays accurate.** If a change affects how
  someone installs, runs, or configures the app, update its "Local
  development" section so the Quick Start still works on a fresh clone.
- **Comment the *why*, not the *what*.** Add a short comment only where
  logic is genuinely tricky or non-obvious — a workaround, a subtle
  constraint, a business rule that isn't clear from the code itself.
  Skip comments on anything self-explanatory.
- **Keep `.env.example` updated.** Any new environment variable the app
  reads gets added there (no real secret values).
- **TSDoc on shared utilities only.** Functions, types, and components used
  in more than one place get a short TSDoc summary. One-off/internal code
  doesn't need it.
