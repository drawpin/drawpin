# Profiles design: review for the owner

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
