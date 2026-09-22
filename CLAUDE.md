# DrawPin — Claude Instructions

DrawPin is a free, mobile-web drawing board for local spots (coffee shops, restaurants). Customers scan a printed QR code or enter a daily 8-digit code, draw a tile, see everyone's tiles live, vote for the weekly winner, and crown a monthly super winner. No app download. Drawing needs no account; voting, winning and reporting need a Google sign-in (ADR-004).

**Before any feature work, read `docs/PLAN.md`.** It is the locked v1 scope. Do not add features, change behavior, or pick new libraries beyond it without asking.

## Working agreement

- **Ask before big decisions**: scope, architecture, data model changes, or picking a new direction. For small stuff (naming, a minor library pick, small refactors), just pick something sensible and mention it.
- Production-level code only: typed, validated, error-handled, tested, documented.
- Follow the `code-documentation` skill (`.claude/skills/code-documentation/SKILL.md`) on every code change.
- Keep changes small and focused on one thing.
- Never commit secrets. Real values go in `.env.local` (git-ignored); every variable is listed in `.env.example`.

## Tech stack (decided)

| Area | Choice |
|---|---|
| App | Next.js (App Router) + TypeScript, hosted on Vercel |
| Database / Storage / Realtime / Auth | Supabase (Postgres, Storage, Realtime, Auth: magic link for owners, Google for customers) |
| Moderation | OpenAI moderation endpoint (text + image) + custom blocklist + NSFWJS drawing check (ADR-005) |
| Bot protection | Cloudflare Turnstile |
| Device limiting | Signed device ID cookie + FingerprintJS (open source), hashed IP |
| Drawing | HTML canvas + `perfect-freehand` |
| Scheduled jobs | On-demand venue-time transitions + daily Vercel Cron for cleanup (ADR-003) |
| Package manager | npm |
| UI/styling | Tailwind CSS + shadcn/ui |
| Linting/formatting | ESLint (`eslint-config-next`) + Prettier |
| Unit tests | Vitest |
| End-to-end tests | Playwright (mobile viewport only) |
| Validation | Zod |

See `docs/adr/002-frontend-tooling.md` for the rationale behind the last five rows.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Local database

The schema lives in `supabase/migrations/` and runs on a local Supabase stack,
which needs [Docker](https://docs.docker.com/desktop/) running:

```bash
npx supabase start     # boots Postgres, Auth, Storage, Studio
npx supabase db reset  # applies every migration from scratch
```

`supabase start` prints the local API URL and keys — copy them into
`.env.local`. Stop the stack with `npx supabase stop`.

Owners sign in with an emailed magic link. Locally no real email is sent: open
the Mailpit inbox at `http://127.0.0.1:54324` to find the link. Use
`http://localhost:3000` rather than `127.0.0.1` so the link lands on the host
holding the session cookies.

The hosted project can't use the custom template in
`supabase/templates/magic_link.html`: free Supabase projects can only edit
auth emails with their own SMTP provider. Until one is set up, owners get
Supabase's default email, whose link only signs in **in the browser that
requested it**. `/auth/confirm` handles both link formats, and the login page
tells owners to use the same browser. Setting up SMTP and the custom template
removes that limitation with no code change.

The schema's domain rules are covered by `supabase/schema.test.ts`, which runs
the migrations against Postgres compiled to WASM. It's part of `npm test` and
needs no Docker.

### Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve a production build |
| `npm run lint` | Lint with ESLint |
| `npm run typecheck` | Generate Next.js route types and type-check with `tsc` |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm test` | Run unit tests once (Vitest) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:e2e` | Run end-to-end tests (Playwright, mobile viewport) |

### Configuration

Copy `.env.example` to `.env.local` and fill it in from the output of
`npx supabase start`.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase API URL; `http://127.0.0.1:54321` locally |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Browser-side key, limited by row level security |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-side key; bypasses RLS, never sent to the browser |
| `SITE_URL` | yes | Public site origin for board links and QR codes; `http://localhost:3000` locally |
| `DEVICE_COOKIE_SECRET` | yes | 32+ random characters; signs the device cookie and derives name tags. Changing it resets daily limits and tags |
| `OPENAI_API_KEY` | yes | Moderation for names, captions and drawings. Restrict the key to `/v1/moderations`; that endpoint is free. Posting is refused while it's missing |
| `MODERATION_BLOCKLIST` | no | Extra blocked words, comma-separated. Links, emails, phone numbers, and a built-in profanity list are always blocked |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | yes | Cloudflare Turnstile site key, rendered in the page. Cloudflare test key `1x00000000000000000000AA` works locally |
| `TURNSTILE_SECRET_KEY` | yes | Turnstile secret, used to verify tokens server-side. Posting and owner sign-in are refused while it is missing. Test secret: `1x0000000000000000000000000000000AA` |
| `CRON_SECRET` | no | Bearer token Vercel Cron sends to the daily cleanup. The endpoint refuses to run while it is unset, which is what you want outside production |

### Health checks

`GET /api/health` is public and cheap: one database round trip, nothing else.
Point an uptime monitor at it.

`GET /api/cron/health` runs daily and asks the things that fail silently —
whether OpenAI still accepts our key, whether Cloudflare still accepts our
Turnstile secret, and whether the database and storage answer. It needs the
`CRON_SECRET` bearer token, and returns 503 when anything is wrong so the run
shows as failed in Vercel.

## Domain rules (quick reference; details in `docs/PLAN.md`)

- All "day" and "week" boundaries use **4:00 AM venue local time**. Weeks start Monday.
- Anyone can draw; only signed-in accounts can be voted for, win, vote, or report. Guest tiles appear on the board marked as not in the running.
- 1 post per device per day, and for a signed-in post, 1 per account per day as well — both must pass. A post blocked by moderation doesn't use it up; 3 blocked attempts lock the device until the next reset.
- A tile is a drawing plus an optional caption (≤ 80 chars). Usernames aren't unique and show a 4-digit tag (e.g. `Ahmad#4821`), derived from the account when signed in and from the device for a guest.
- Voting on week N's board happens during week N+1. Anyone signed in can vote: 3 votes per account per week, from any device, on different tiles, not your own, and votes are final.
- Each week's most-voted tile (at least 1 vote) is its winner; ties go to the earlier post. Each month, up to 4 weekly winners (by votes) go to a one-week final (1 vote per account) that crowns a super winner.
- Winners are kept forever; other tiles are deleted 30 days after voting ends.
- One board per owner. The owner admin has four things only: QR + today's code, Pause board, Remove tile, and reported tiles.
- Store only hashes of IPs and fingerprints.

## Repository layout

```
TODO.md               what is left to do, in order
docs/
  PLAN.md             locked product plan
  adr/                architecture decision records (NNN-title.md)
  api/openapi.yaml    API route contracts
  components/         feature/module docs
  ERD.md              database tables
  assets/             README/showcase images (e.g. the logo)
supabase/migrations/  schema as code
src/                  Next.js app
.claude/skills/       project skills for Claude
.github/              templates, CI, CODEOWNERS
```

Create folders as they're first needed. Don't add empty placeholder files.

New tables get no Data API privileges by default (hosted and local). Every migration that creates a table must also enable RLS and grant its privileges explicitly; see `docs/ERD.md`, Data API grants.

## Git workflow

Trunk-based: `main` is the only long-lived branch and every merge to it deploys to production. See `docs/adr/001-trunk-based-branching.md`.

- `main` is protected. Never commit or push directly to `main` — use a branch + PR.
- One branch → one pull request. An issue isn't required for every change.
- Branch names: `type/short-name`, with an issue number when there is one, e.g. `feat/qr-join`, `fix/31-vote-limit`, `chore/lighten-process`.
- Commit messages follow Conventional Commits: `feat: …`, `fix: …`, `docs: …`, `chore: …`, `refactor: …`, `test: …`. Use the imperative mood and a short summary line.
- PR description: what changed, why, how it was tested, and `Closes #<issue>` if there is one.
- Pull requests are squash-merged. Keep history linear (rebase on `main`, no merge commits).
- Once CI passes, you may push and merge your own PRs with `gh pr merge --squash --delete-branch`, then switch back to `main` and pull. Never force-push, and never merge if CI is failing.

## Before saying a task is done

- [ ] Lint, typecheck, and tests pass
- [ ] It works
- [ ] No leftover junk: debug logs, dead code, or TODOs without a note

## Diagrams

- System architecture: https://lucid.app/lucidchart/629ff9fe-e215-4bbb-b5d9-120f87a55a8e/edit
- Post, vote & weekly cycle flows: https://lucid.app/lucidchart/d0cb474a-8eba-4d8d-8fce-4ad46bc47bb6/edit
- Database ERD: https://lucid.app/lucidchart/1e2f0c20-87e8-4065-9f7e-11c4fc2a4124/edit
