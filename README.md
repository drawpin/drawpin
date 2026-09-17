# DrawPin

A free, mobile-web drawing board for local spots (coffee shops, restaurants).
Customers scan a printed QR code or enter a daily 8-digit code, draw a tile,
see everyone's tiles live, and vote for the weekly winner. No app download and
no customer accounts.

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

Owners sign in with an emailed magic link. Locally no real email is sent: open
the Mailpit inbox at [http://127.0.0.1:54324](http://127.0.0.1:54324) to find
the link. Use `http://localhost:3000` rather than `127.0.0.1` so the link lands
on the host holding the session cookies.

The hosted project can't use the custom template in
`supabase/templates/magic_link.html`: free Supabase projects can only edit auth
emails with their own SMTP provider. Until one is set up, owners get Supabase's
default email, whose link only signs in **in the browser that requested it**.
`/auth/confirm` handles both link formats, and the login page tells owners to
use the same browser. Setting up SMTP and the custom template removes that
limitation with no code change.

The schema's domain rules are covered by `supabase/schema.test.ts`, which runs
the migrations against Postgres compiled to WASM. It's part of `npm test` and
needs no Docker.

## Tech Stack

| Area                                       | Choice                                                       |
| ------------------------------------------ | ------------------------------------------------------------ |
| App                                        | Next.js (App Router) + TypeScript, hosted on Vercel          |
| Database / Storage / Realtime / Owner auth | Supabase (Postgres, Storage, Realtime, magic-link Auth)      |
| Moderation                                 | OpenAI moderation endpoint (text + image) + custom blocklist |
| Bot protection                             | Cloudflare Turnstile                                         |
| Device limiting                            | Signed device ID cookie + FingerprintJS, hashed IP           |
| Drawing                                    | HTML canvas + `perfect-freehand`                             |
| UI/styling                                 | Tailwind CSS + shadcn/ui                                     |
| Validation                                 | Zod                                                          |
| Scheduled jobs                             | On-demand transitions + daily Vercel Cron (ADR-003)          |
| Package manager                            | npm                                                          |

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
output of `npx supabase start`. More variables arrive as moderation and
bot-protection land.

| Variable                        | Required | Description                                                                                                                                      |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | yes      | Supabase API URL; `http://127.0.0.1:54321` locally                                                                                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes      | Browser-side key, limited by row level security                                                                                                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | yes      | Server-side key; bypasses RLS, never sent to the browser                                                                                         |
| `SITE_URL`                      | yes      | Public site origin for board links and QR codes; `http://localhost:3000` locally                                                                 |
| `DEVICE_COOKIE_SECRET`          | yes      | 32+ random characters; signs the device cookie and derives name tags. Changing it resets daily limits and tags                                   |
| `OPENAI_API_KEY`                | yes      | Moderation for names, captions and drawings. Restrict the key to `/v1/moderations`; that endpoint is free. Posting is refused while it's missing |
| `MODERATION_BLOCKLIST`          | no       | Extra blocked words, comma-separated. Links, emails and phone numbers are always blocked                                                         |

## Contributing

- One branch → one pull request. Branches: `type/short-name`, with an issue number when there is one.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- `main` is the only long-lived branch (trunk-based, see
  [`docs/adr/001-trunk-based-branching.md`](docs/adr/001-trunk-based-branching.md));
  pull requests are squash-merged.
- Full working agreement is in [`CLAUDE.md`](CLAUDE.md).

## License

Not yet licensed for external use.
