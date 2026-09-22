<p align="center">
  <img src="docs/assets/logo.png" alt="DrawPin" width="420">
</p>

<p align="center">
  A free shared drawing board for local spots. Scan a code, draw a tile,
  vote for the winner — no app, no account to play.
</p>

<p align="center">
  <a href="https://drawpin.io"><strong>drawpin.io →</strong></a>
</p>

---

## What it is

Coffee shops and restaurants print a QR code for their table. Anyone who
scans it can draw one small tile a day — a doodle, a joke, a tiny piece of
art — and watch everyone else's tiles fill up the board live. A week later,
customers vote for their favorite, that week's winner joins the venue's Hall
of Fame, and the best week of each month goes on to crown a super winner.

Drawing needs nothing: no download, no account, no email. Voting and winning
ask for a Google sign-in, because a vote and a win should belong to somebody.

## Why I built it

<!-- TODO(ahmad): your story goes here — what got you started on this,
     what you were trying to prove or learn, whatever's true. -->

## What I learned

<!-- TODO(ahmad): the real takeaways — technical, product, or otherwise. -->

## How it works

|          |                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Join** | A printed QR opens the venue's board directly. No QR handy? Type the 8-digit code shown at the venue instead — it rotates daily.                                   |
| **Draw** | One tile a day per person: a freehand drawing plus an optional caption. Guests can draw too, shown on the board but not in the running.                            |
| **Vote** | The following week, anyone signed in picks three favorites from last week's board. Votes are final, and results stay hidden until voting closes.                   |
| **Win**  | The most-voted tile becomes that week's winner and joins the venue's permanent Hall of Fame. Each month, the four best weekly winners face off for a super winner. |

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

Building and running it yourself is covered in [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

Not yet licensed for external use.
