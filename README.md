# DrawPin

A free, mobile-web drawing board for local spots (coffee shops, restaurants).
Customers scan a printed QR code or enter a daily 8-digit code, draw a tile,
see everyone's tiles live, and vote on the weekly top 7. No app download and
no customer accounts.

See [`docs/PLAN.md`](docs/PLAN.md) for the full, locked v1 product scope.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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
| Scheduled jobs                             | Vercel Cron (hourly)                                         |
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

No environment variables are consumed by the app yet. Copy
[`.env.example`](.env.example) to `.env.local` and see it for what's expected
as Supabase, moderation, and bot-protection integrations land.

## Contributing

- One issue → one branch → one pull request. Branches: `type/<issue#>-short-name`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- `main` is the only long-lived branch (trunk-based, see
  [`docs/adr/001-trunk-based-branching.md`](docs/adr/001-trunk-based-branching.md));
  pull requests are squash-merged.
- Full working agreement is in [`CLAUDE.md`](CLAUDE.md).

## License

Not yet licensed for external use.
