# DrawPin — Claude Instructions

DrawPin is a free, mobile-web drawing board for local spots (coffee shops, restaurants). Customers scan a printed QR code or enter a daily 8-digit code, draw a tile, see everyone's tiles live, and vote on the weekly top 7. No app download and no customer accounts.

**Before any feature work, read `docs/PLAN.md`.** It is the locked v1 scope. Do not add features, change behavior, or pick new libraries beyond it without asking.

## Working agreement

- **Ask before committing to anything you're unsure about**: scope, architecture, library choices, naming, data model changes. Propose options with a recommendation, then wait.
- Production-level code only: typed, validated, error-handled, tested, documented.
- Follow the `code-documentation` skill (`.claude/skills/code-documentation/SKILL.md`) on every code change.
- Keep changes small and scoped to one issue.
- Never commit secrets. Real values go in `.env.local` (git-ignored); every variable is listed in `.env.example`.

## Tech stack (decided)

| Area | Choice |
|---|---|
| App | Next.js (App Router) + TypeScript, hosted on Vercel |
| Database / Storage / Realtime / Owner auth | Supabase (Postgres, Storage, Realtime, magic-link Auth) |
| Moderation | OpenAI moderation endpoint (text + image) + custom blocklist |
| Bot protection | Cloudflare Turnstile |
| Device limiting | Signed device ID cookie + FingerprintJS (open source), hashed IP |
| Drawing | HTML canvas + `perfect-freehand` |
| Scheduled jobs | Vercel Cron (hourly) |
| Package manager | npm |
| UI/styling | Tailwind CSS + shadcn/ui |
| Linting/formatting | ESLint (`eslint-config-next`) + Prettier |
| Unit tests | Vitest |
| End-to-end tests | Playwright (mobile viewport only) |
| Validation | Zod |

See `docs/adr/002-frontend-tooling.md` for the rationale behind the last five rows.

## Domain rules (quick reference; details in `docs/PLAN.md`)

- All "day" and "week" boundaries use **4:00 AM venue local time**. Weeks start Monday.
- 1 post per device per day. A post blocked by moderation doesn't use it up; 3 blocked attempts lock the device until the next reset.
- A tile is a drawing plus an optional caption (≤ 80 chars). Username is optional, not unique, and shown with a 4-digit tag (e.g. `Ahmad#4821`).
- Voting on week N's board happens during week N+1. Anyone with the link can vote: 3 votes per device, on different tiles, not your own, and votes are final.
- The top 7 go to the Hall of Fame; ties go to the earlier post. Hall of Fame is kept forever; other tiles are deleted 30 days after voting ends.
- One board per owner. The owner admin has three things only: QR + today's code, Pause board, Remove tile.
- Store only hashes of IPs and fingerprints.

## Repository layout

```
docs/
  PLAN.md             locked product plan
  adr/                architecture decision records (NNN-title.md)
  api/openapi.yaml    API route contracts
  components/         feature/module docs
  ERD.md              database tables
supabase/migrations/  schema as code
src/                  Next.js app
.claude/skills/       project skills for Claude
.github/              templates, CI, CODEOWNERS
```

Create folders as they're first needed. Don't add empty placeholder files.

## Git workflow

Trunk-based: `main` is the only long-lived branch and every merge to it deploys to production. See `docs/adr/001-trunk-based-branching.md`.

- `main` is protected. Never commit or push directly to `main`.
- One issue → one branch → one pull request.
- Branch names: `type/<issue#>-short-name`, e.g. `feat/12-qr-join`, `fix/31-vote-limit`, `chore/1-repo-foundation`, `docs/8-erd`.
- Commit messages follow Conventional Commits: `feat: …`, `fix: …`, `docs: …`, `chore: …`, `refactor: …`, `test: …`. Use the imperative mood and a short summary line.
- PR description: what changed, why, how it was tested, and `Closes #<issue>`.
- Pull requests are squash-merged. Keep history linear (rebase on `main`, no merge commits).
- Don't push, open PRs, or merge unless asked.

## Before saying a task is done

- [ ] Type check, lint, and tests pass (once configured)
- [ ] New or changed behavior has tests
- [ ] Documentation checklist from the `code-documentation` skill is satisfied
- [ ] No secrets, debug logs, or commented-out code left behind
- [ ] Changes stay within `docs/PLAN.md` scope, or the deviation was approved

## Diagrams

- System architecture: https://lucid.app/lucidchart/629ff9fe-e215-4bbb-b5d9-120f87a55a8e/edit
- Post, vote & weekly cycle flows: https://lucid.app/lucidchart/d0cb474a-8eba-4d8d-8fce-4ad46bc47bb6/edit
- Database ERD: https://lucid.app/lucidchart/1e2f0c20-87e8-4065-9f7e-11c4fc2a4124/edit
