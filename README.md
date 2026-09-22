<p align="center">
  <img src="docs/assets/logo.png" alt="DrawPin" width="660" height="330">
</p>

<p align="center">
  A free shared drawing board for local spots. Scan a code, draw a tile —
  no app to download, no account needed to draw.
</p>

<p align="center">
  <a href="https://drawpin.io"><strong>drawpin.io →</strong></a>
</p>

---

## What is DrawPin

Coffee shops and restaurants print a QR code for their table. Anyone who
scans it can draw one small tile a day — a doodle, a joke, a tiny piece of
art — and watch everyone else's tiles fill up the board live. A week later,
customers vote for their favorite, that week's winner joins the venue's Hall
of Fame, and the best week of each month goes on to crown a super winner.

Drawing needs nothing: no download, no account, no email. Voting and winning
ask for a Google sign-in, because a vote and a win should belong to somebody.

## Why I built it

I'm a software engineer who loves building and shipping products, but just as
much, I love learning. System design is a huge part of what it means to be a
good engineer, and I wanted a real project to learn it on rather than a
tutorial.

The idea came from watching the restaurant industry from the inside: the
stretches where customers are just waiting — for a table, for food, with kids
to keep entertained, or just killing time. A simple way to compete against
each other is a proven way to keep people engaged and bring them back, so a
shared drawing board that turns into a weekly and monthly competition felt
like a fun, low-stakes way to fill that time.

Mostly, though, I started this to learn: system design, product development,
CI/CD, and the parts of being a software engineer that don't show up in a
tutorial — where "it compiles" is nowhere near "it's correct," and correctness
in production is a different discipline from correctness on a whiteboard.

## What I learned

During this project, I learned:

- **System design under real constraints, not on paper.** I modeled a weekly
  voting cycle, derived a week's status from timestamps instead of storing
  it, and built "on-demand" jobs that are idempotent and race-safe instead
  of a cron I couldn't actually run on a free hosting tier ([ADR-003](docs/adr/003-on-demand-venue-time-transitions.md)).
- **Trust and safety at a small scale.** I layered automated moderation (a
  vendor API, a curated blocklist, and eventually a self-hosted ML model)
  with a human backstop, and learned the hard way that off-the-shelf tools
  have real, specific blind spots you only find by testing them, not by
  assuming they work ([ADR-005](docs/adr/005-nsfw-drawing-classifier.md)).
- **Shipping ML in a real product, not a notebook.** I learned that what
  actually gets bundled and deployed matters as much as the model itself —
  chasing a dependency down from 38 MB to 3.5 MB, and a "missing file" bug
  that only showed up in a production build, never in local testing.
- **Trunk-based development and CI/CD, end to end.** Every merge to `main`
  deploys, so I got comfortable with small PRs, fast checks, and shipping
  continuously instead of batching up changes.
- **Working within real platform limits instead of ignoring them.** A
  free-tier cron schedule, a magic-link email provider I couldn't fully
  customize without paid infrastructure, a bot-protection widget with a
  hostname allowlist that quietly broke the moment I changed domains.
- **Writing decisions down.** I started keeping ADRs so a call I made
  once — and the reasons for it — didn't have to be re-litigated or
  rediscovered months later.

I can't wait to see this used in restaurants, cafes, friend groups, and
anywhere something as simple as a doodle can make a difference.

## How it works

|          |                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Join** | A printed QR opens the venue's board directly. No QR handy? Type the 8-digit code shown at the venue instead — it rotates daily.                                         |
| **Draw** | One tile a day per person: a freehand drawing, and add a caption if you want.                                                                                            |
| **Vote** | The following week, vote on others' tiles by picking your three favorites.                                                                                               |
| **Win**  | The most-voted tile becomes that week's winner and joins the venue's permanent Hall of Fame. Each month, the four best weekly winners face off for an even bigger title! |

## System design

- **Architecture** — [system diagram](https://lucid.app/lucidchart/629ff9fe-e215-4bbb-b5d9-120f87a55a8e/edit), [post/vote/weekly-cycle flows](https://lucid.app/lucidchart/d0cb474a-8eba-4d8d-8fce-4ad46bc47bb6/edit), [database ERD](https://lucid.app/lucidchart/1e2f0c20-87e8-4065-9f7e-11c4fc2a4124/edit)
- **Decisions** — every non-obvious call (why trunk-based git, why on-demand time transitions instead of a cron, why a second nudity classifier alongside OpenAI's) is written up as an ADR in [`docs/adr/`](docs/adr/)
- **Product scope** — the full, locked v1 plan lives in [`docs/PLAN.md`](docs/PLAN.md)

A few of the harder problems this project ended up solving:

- **Moderation with no staff approval.** Every drawing is checked automatically
  (OpenAI's moderation endpoint, a curated profanity list, and a second,
  drawing-specific nudity classifier — general NSFW models are trained on
  photos, not hand-drawn line art) before it's ever visible, with a manual
  "Remove tile" as the human backstop for whatever slips through
  ([ADR-005](docs/adr/005-nsfw-drawing-classifier.md)).
- **A weekly cycle with no scheduler running the show.** Weeks, daily codes,
  and Hall of Fame results are all computed on demand, the moment they're
  first needed, rather than by a background job — see
  [ADR-003](docs/adr/003-on-demand-venue-time-transitions.md).
- **One post a day without an account.** A signed device cookie plus a
  browser fingerprint carries the daily limit for guests; accounts layer on
  top for anyone who signs in.

## Tech stack

| Area                          | Choice                                                      |
| ----------------------------- | ----------------------------------------------------------- |
| App                           | Next.js (App Router) + TypeScript, on Vercel                |
| Database / Storage / Realtime | Supabase (Postgres, Storage, Realtime)                      |
| Moderation                    | OpenAI moderation + custom blocklist + NSFWJS drawing check |
| Bot protection                | Cloudflare Turnstile                                        |
| Drawing                       | HTML canvas + `perfect-freehand`                            |
| UI                            | Tailwind CSS + shadcn/ui                                    |

## License

All rights reserved. This repository is public to show the project — no
license is granted to use, copy, modify, or redistribute the code.
