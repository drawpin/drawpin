---
name: code-documentation
description: Lightweight code documentation habits for DrawPin — accurate CONTRIBUTING setup docs, comments on tricky logic, current .env.example, TSDoc on shared utilities. Use whenever writing or changing code.
---

# Code Documentation

Keep it light. This is a hobby project — the goal is a codebase a future
contributor (or future you) can pick up quickly, not exhaustive paperwork.

- **README.md is public-facing, not a setup guide.** It's what a visitor to
  the repo sees: what DrawPin is, why it exists, how it works, the system
  design. It doesn't cover installing, running, or configuring the app —
  that's [`CONTRIBUTING.md`](../../../CONTRIBUTING.md). Don't add dev/setup
  content back into the README; update CONTRIBUTING.md instead.
- **CONTRIBUTING's quick start stays accurate.** If a change affects how
  someone installs, runs, or configures the app, update CONTRIBUTING.md so
  its Quick Start still works on a fresh clone.
- **Comment the *why*, not the *what*.** Add a short comment only where
  logic is genuinely tricky or non-obvious — a workaround, a subtle
  constraint, a business rule that isn't clear from the code itself.
  Skip comments on anything self-explanatory.
- **Keep `.env.example` updated.** Any new environment variable the app
  reads gets added there (no real secret values).
- **TSDoc on shared utilities only.** Functions, types, and components used
  in more than one place get a short TSDoc summary. One-off/internal code
  doesn't need it.
