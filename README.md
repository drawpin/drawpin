# DrawPin

A free, mobile-web shared drawing board for any group of people — a café, a
classroom, a party, a group chat. People scan a printed QR code or enter an
8-digit code, draw a tile, see everyone's tiles live, vote for the weekly
winner, and crown a monthly super winner. No app download. Anyone can draw for
fun; posting, voting and reporting need a sign-in, with Google or a code
emailed to any address.

See [`docs/PLAN.md`](docs/PLAN.md) for the full, locked v1 product scope.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Local database

The schema lives in `supabase/migrations/` and runs on a local Supabase stack,
which needs [Docker](https://docs.docker.com/desktop/) running:

```bash
npx supabase start     # boots Postgres, Auth, Storage, Studio
npx supabase db reset  # applies every migration from scratch
```

`supabase start` prints the local API URL and keys — copy them into
`.env.local`. Stop the stack with `npx supabase stop`.

Owners, and customers without Google, sign in with an emailed code; owners
can tap the email's link instead. Locally no real email is sent: open the
Mailpit inbox at [http://127.0.0.1:54324](http://127.0.0.1:54324) to find it.
Use `http://localhost:3000` rather than `127.0.0.1` so a link lands on the
host holding the session cookies.

The email is `supabase/templates/magic_link.html`. The local stack reads it
from `config.toml`; hosted projects don't, so it is pasted into **Magic Link**
and **Confirm signup** under Authentication → Emails on both Supabase projects,
which send through custom SMTP (Resend). Change it in both places.

The schema's domain rules are covered by `supabase/schema.test.ts`, which runs
the migrations against Postgres compiled to WASM. It's part of `npm test` and
needs no Docker.

## Tech Stack

| Area                                 | Choice                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| App                                  | Next.js (App Router) + TypeScript, hosted on Vercel                                     |
| Database / Storage / Realtime / Auth | Supabase (Postgres, Storage, Realtime, Auth: Google or emailed code)                    |
| Moderation                           | OpenAI moderation + vision model (ADR-006) + NSFWJS drawing check (ADR-005) + blocklist |
| Email                                | Custom SMTP through Resend, from `hello@drawpin.io`                                     |
| Bot protection                       | Cloudflare Turnstile                                                                    |
| Device limiting                      | Signed device ID cookie + FingerprintJS, hashed IP                                      |
| Drawing                              | HTML canvas + `perfect-freehand`                                                        |
| UI/styling                           | Tailwind CSS + shadcn/ui                                                                |
| Validation                           | Zod                                                                                     |
| Scheduled jobs                       | On-demand transitions + daily Vercel Cron (ADR-003)                                     |
| Package manager                      | npm                                                                                     |

Decisions and rationale are recorded as ADRs in [`docs/adr/`](docs/adr/).

## Scripts

| Script                 | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| `npm run dev`          | Start the Next.js dev server                           |
| `npm run build`        | Production build                                       |
| `npm run start`        | Serve a production build                               |
| `npm run lint`         | Lint with ESLint                                       |
| `npm run typecheck`    | Generate Next.js route types and type-check with `tsc` |
| `npm run format`       | Format with Prettier                                   |
| `npm run format:check` | Check formatting without writing                       |
| `npm test`             | Run unit tests once (Vitest)                           |
| `npm run test:watch`   | Run unit tests in watch mode                           |
| `npm run test:e2e`     | Run end-to-end tests (Playwright, mobile viewport)     |

## Configuration

Copy [`.env.example`](.env.example) to `.env.local` and fill it in from the
output of `npx supabase start`.

| Variable                                  | Required | Description                                                                                                                                                                             |
| ----------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                | yes      | Supabase API URL; `http://127.0.0.1:54321` locally                                                                                                                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`           | yes      | Browser-side key, limited by row level security                                                                                                                                         |
| `SUPABASE_SERVICE_ROLE_KEY`               | yes      | Server-side key; bypasses RLS, never sent to the browser                                                                                                                                |
| `SITE_URL`                                | yes      | Public site origin for board links and QR codes; `http://localhost:3000` locally                                                                                                        |
| `DEVICE_COOKIE_SECRET`                    | yes      | 32+ random characters; signs the device cookie and derives name tags. Changing it resets daily limits and tags                                                                          |
| `OPENAI_API_KEY`                          | yes      | Moderation for names, captions and drawings. Restrict the key to `/v1/moderations` (free) and `/v1/chat/completions` (the vision check, ADR-006). Posting is refused while it's missing |
| `MODERATION_BLOCKLIST`                    | no       | Extra blocked words, comma-separated. They, links, emails, phone numbers and a built-in profanity list apply by board moderation level (ADR-012)                                        |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`          | yes      | Cloudflare Turnstile site key, rendered in the page. Cloudflare test key `1x00000000000000000000AA` works locally                                                                       |
| `TURNSTILE_SECRET_KEY`                    | yes      | Turnstile secret, used to verify tokens server-side. Posting and owner sign-in are refused while it is missing. Test secret: `1x0000000000000000000000000000000AA`                      |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | no       | Google sign-in for the local stack (read by `config.toml`). Hosted projects set it in the dashboard                                                                                     |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`    | no       | The matching Google client secret                                                                                                                                                       |
| `RESEND_API_KEY`                          | no       | Lets the daily health check email when a dependency fails. Without it the check still fails the cron run, but nobody is told                                                            |
| `CRON_SECRET`                             | no       | Bearer token Vercel Cron sends to the daily cleanup. The endpoint refuses to run while it is unset, which is what you want outside production                                           |

## Health checks

`GET /api/health` is public and cheap: one database round trip, nothing else.
Point an uptime monitor at it.

`GET /api/cron/health` runs daily and asks the things that fail silently —
whether OpenAI still accepts our key, whether Cloudflare still accepts our
Turnstile secret, and whether the database and storage answer. It needs the
`CRON_SECRET` bearer token, and returns 503 when anything is wrong so the run
shows as failed in Vercel, and emails through Resend when `RESEND_API_KEY` is set.

## Contributing

- One branch → one pull request. Branches: `type/short-name`, with an issue number when there is one.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- `main` is the only long-lived branch (trunk-based, see
  [`docs/adr/001-trunk-based-branching.md`](docs/adr/001-trunk-based-branching.md));
  pull requests are squash-merged.
- Decisions and rationale live in [`docs/adr/`](docs/adr/).

## License

Not yet licensed for external use.
