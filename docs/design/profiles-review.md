# Profiles design: review for the owner

## Built: what to review before `feat/profiles` merges (2026-11-02)

Everything below is built on `feat/profiles` (PRs #207 and #209–#216; draft PR #208 into `main`). Lint, typecheck, 1216 unit tests, the build and all 10 Playwright phone flows pass on the combined branch against the local Supabase.

### Try it
- **On the PC:** `git checkout feat/profiles`, `npx supabase start`, then `npx next dev`.
- **On a phone:** the dev server blocks a phone's scripts, so serve a production build instead: `npx next build && npx next start -H 0.0.0.0`, then open `http://<PC IP>:3000`.
- **Local test boards:** `shell-office-doodles`, `shell-friends-board`, `shell-book-club`, `shell-art-class`, and `me-test-*`.

### Decisions waiting on you
1. **Landing.** `LANDING` in `src/lib/landing.ts`, currently `"hub"`.
   - `"hub"`: signed-in people with a username land on their hub, everyone else sees the marketing home, and `/about` shows it to anyone.
   - `"marketing"`: everyone gets the marketing home, and the hub moves to `/home`.
2. **Your 4-digit tag changes when you change your name.** The existing `nameTagFor(userId, name)` mixes in the name, so `Ahmad#7611` became `Ahmad H#5358`.
   - Recommendation: base the tag on the account only, so it stays the same.
   - That changes every existing tag once, so it's your call.
3. **Username length.** It's 40, the same as `/welcome`. The design said 24.
4. **Smaller design picks.** Flip any of these if you like:
   - The sidebar shows 8 boards, and the rest are on the hub.
   - Up to 5 boards can be pinned.
   - Boards remembered on a signed-out device can be removed but not pinned.
   - Delete account lives only on `/me`.
   - Sign out is in the sidebar footer.
   - The hub's "Manage →" goes to `/admin`.
5. **The sign-in code copy** says it "works for 15 minutes", which matches the email template. The design said 1 hour.

### Known gaps (small, fix before merge or accept)
- **The email's link carries no return path.** `supabase/templates/magic_link.html` doesn't pass `next`, so `/auth/confirm` sends the link's tap to `/admin`. A drawer who taps the link instead of typing the code ends up on `/setup`; codes and Google are fine.
  - Fix: add `&next={{ .RedirectTo }}` handling to the template.
  - Then re-paste the template into both Supabase projects (Magic Link and Confirm signup).
- **Signing in from the sidebar on the draw page doesn't keep an unposted drawing.** The Post button does.
- **Trophies only appear once someone opens the board.** A week that closed with nobody visiting since doesn't show on `/me` until its board is opened, because winners are crowned on demand (ADR-003).
- **The sidebar and the hub each load the account's boards,** so those reads happen twice on `/`.
- **`/` now renders per request,** because the sidebar reads the session.

### Before merging to `main`
1. **Delete the prototypes:** `src/app/prototype/`.
2. **Supabase → Auth → URL Configuration,** in both projects: add `https://drawpin.io/**` to the redirect allow-list. Email links now carry `?next=`.
3. **Restore the preview project** (`drawpin-preview`; it's been timing out since 2 November, probably paused). Then apply `20261102120000_several_boards_and_board_visits.sql` there.
4. **Push that migration to production** from the board-link checkout (`npx supabase db push`). Check it with `npx supabase migration list --linked` before merging.
5. **Re-paste the email template** if you take the email-link fix above.
6. **Mark PR #208 ready, then squash-merge it** once CI is green. That deploys.

---

The prototypes for PLAN v20 (profiles, sidebar, several boards). I picked a default wherever there was a choice, as asked in plan 4b. Each one is listed here with the alternatives, so you can flip any of them. The build spec is [profiles.md](profiles.md).

**Seeing it:**
- Run `npm run dev` on `feat/profiles` and open `/prototype/profiles`. It's dev only, and every screen has a link there.
- All images are in `docs/design/profiles/`.
  - Phone shots are 390×844 at 2x; desktop shots are 1280×800.
  - `-phone-open` means the phone drawer is open.
  - Tall pages are full-page captures.
- The prototype routes are temporary, and get deleted before `feat/profiles` merges to main.

## 1. Sidebar and drawer: three variants

| Variant | Desktop | Phone (drawer open) |
| --- | --- | --- |
| **A. White inked card (picked)** | `sidebar-a-out-desktop.webp`, `sidebar-a-in-desktop.webp`, `sidebar-a-runner-desktop.webp` | `sidebar-a-out-phone-open.webp`, `sidebar-a-in-phone-open.webp`, `sidebar-a-runner-phone-open.webp` |
| B. Blue poster | `sidebar-b-out-desktop.webp`, `sidebar-b-in-desktop.webp`, `sidebar-b-runner-desktop.webp` | `sidebar-b-out-phone-open.webp`, `sidebar-b-in-phone-open.webp`, `sidebar-b-runner-phone-open.webp` |
| C. Drawing rail + bottom sheet | `sidebar-c-out-desktop.webp`, `sidebar-c-in-desktop.webp`, `sidebar-c-runner-desktop.webp` | `sidebar-c-out-phone-open.webp`, `sidebar-c-in-phone-open.webp`, `sidebar-c-runner-phone-open.webp` |

- **Pick: A.** The blue stays the board's poster, so the white card sits beside it without competing, and it reads like the home page's "Have a code?" card.
- **B** puts two blue cards side by side on every page. The board's own header loses its standing, and white text at 12px is harder to read.
- **C** is the most compact on a laptop, but board names only show on hover. On a phone, a bottom sheet with this much content scrolls inside a sheet, which is awkward.

**Interactions and states (variant A):**
- **The "…" menu on a board row:** pin, unpin and remove. `sidebar-a-row-menu-desktop.webp`, `sidebar-a-row-menu-phone-open.webp`.
- **Empty state:** `sidebar-a-empty-desktop.webp`, `sidebar-a-empty-phone-open.webp`.
- **The header on a board page:** `header-board-phone.webp`, `header-board-desktop.webp`.
  - The menu button replaces the "← DrawPin" link inside the blue card, so it costs no height.
  - The Pin toggle sits top-right.
- **The draw page:** `header-draw-phone.webp`, `header-draw-desktop.webp`, `header-draw-phone-open.webp`.
  - No sidebar column, even on a laptop.
  - The menu button sits on the right of the "Draw a tile" row.
  - There is no edge swipe, so the drawer never fights the canvas.

**Choices you may want to flip:**
- **The Owner chip** is a small "Owner" label on the status line. Alternatives: a gear icon, or no chip (since "Boards you run" lists them anyway).
- **Delete account** is on the profile only, not in the sidebar as the plan listed it. I kept destructive actions out of navigation.
- **Status dot colours** follow the actions: yellow for draw (like the Draw button), blue for vote, orange for final, light blue for results. They always come with words.
- **The sidebar's join row** uses "Open" (short, to fit), where the full card says "Open the board".

## 2. Landing: hub vs marketing

| | Phone | Desktop |
| --- | --- | --- |
| **1. Home hub (picked for signed-in)** | `landing-hub-phone.webp` | `landing-hub-desktop.webp` |
| 1b. Hub, all caught up | `landing-hub-caught-up-phone.webp` | `landing-hub-caught-up-desktop.webp` |
| 2. Marketing home + sidebar | `landing-marketing-phone.webp` | `landing-marketing-desktop.webp` |

- **Pick: the hub for signed-in visitors, and the marketing page for everyone signed out.** This matches your leaning.
  - A regular opens drawpin.io to "Draw today at Office Doodles" and "3 votes left", which is what brings them back.
  - The poster's job is to explain DrawPin to someone new, and a regular doesn't need it again.
- **The marketing page stays reachable** from the sidebar's "About" link. I've suggested the route `/about`, which is new: say if you'd rather not add it.
- **Flip it:** both are built behind one constant, `LANDING` in `src/lib/landing.ts`. `"marketing"` gives everyone the marketing home, and the hub is then the sidebar's "Home" link.
- **Other choices in the hub:**
  - **Phone board cards** scroll sideways rather than stacking, which keeps the page about two screens long. The alternative is a 2-column grid of smaller cards.
  - **Today cards' shadows** take the status colour (yellow, blue, orange, light blue). The alternative is all blue, like other cards.
  - **The greeting** "Hi, {name}." The alternative is a handwritten note, "Welcome back".

## 3. Profile hub

| | Phone | Desktop |
| --- | --- | --- |
| Profile | `profile-phone.webp` | `profile-desktop.webp` |
| Changing your name (inline in the header) | `profile-change-name.webp` | |

- **One design.** The order is stats, trophies, votes, drawings, then the account.
- **Pick reason:**
  - The trophies come before the full drawings list because they're what people show off.
  - The votes section is light and the first to cut.
- **Choices:**
  - **Route:** the page is planned as `/me`, with `/account` redirecting there. The alternative is to keep `/account`.
  - **Trophy shelf:** drawings stand on an inked plank. The alternative is a plain grid with trophy badges.
  - **"Kept forever"** is a yellow chip on winners. The alternative is plain text, like "Kept until".

## 4. Board runner

| | Phone | Desktop |
| --- | --- | --- |
| `/admin`: your boards, 2 of 5 | `admin-list-phone.webp` | `admin-list-desktop.webp` |
| At the cap, 5 of 5 | `admin-list-at-cap-phone.webp` | `admin-list-at-cap-desktop.webp` |
| A board's admin, switcher open | `admin-switcher-phone.webp` | `admin-switcher-desktop.webp` |

- **Pick reason:**
  - **The board's name is the switcher.** That's where you look to know which board you're managing, so it adds no new control.
  - **At the cap,** Start a board is replaced by a calm explanation, not a disabled button.
- **Choices:**
  - **Sign out** moves from the admin header to the sidebar.
  - **Sidebar "Boards you run" links** go straight to each board's admin. The alternative is a single "Manage boards" link to `/admin`.

## 5. Sign-in sheet

| | Phone | Desktop |
| --- | --- | --- |
| Step 1: Google or email | `sign-in-sheet-phone.webp` | `sign-in-sheet-desktop.webp` |
| Step 2: the code | `sign-in-sheet-code-phone.webp` | `sign-in-sheet-code-desktop.webp` |

- **One responsive design:** a bottom sheet on a phone (swipe down to close), a centred card on a laptop.
- **Pick reason:** it's opened over the page you're on and returns you there. The small print says so: "You'll come back to Office Doodles".
- **Choices:**
  - **Google is an outline button** at the same weight as the email way. Today it's a small pill with the email option folded away.
    - Showing both equally fits "an emailed code to any address" (ADR-010), and one sign-in for owners too.
    - The alternative is to keep the email option folded behind a link, as today.
  - **The title** is "Keep your boards in one place". The alternative is a plain "Sign in to DrawPin".

## Things I decided that touch the plan

These are small, but you may want to confirm them in the ADRs:

1. **Recent boards in the sidebar are capped at 8,** with the rest on the hub.
2. **Pinned boards are capped at 5,** as the plan says. At the limit, Pin is disabled with a note.
3. **Signed-out device boards can be removed but not pinned.** Pinning needs an account.
4. **When several statuses apply,** the dot shows the first in this order: final, vote, draw, results.
5. **The root layout's footer links** (Privacy, Terms) move into the sidebar footer on pages inside the shell.
