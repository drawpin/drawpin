# Profiles, sidebar and several boards: design spec

For the people building PLAN v20 (plan: profiles, a global sidebar, several boards per account). This is the consolidated design after the prototype step. The owner's review notes and the alternatives are in [profiles-review.md](profiles-review.md); screenshots are in [profiles/](profiles/).

The prototypes are throwaway routes under `src/app/prototype/profiles` (index at `/prototype/profiles`, dev only, 404 in production). They use hard-coded data. **Delete `src/app/prototype` before `feat/profiles` merges to main.** Build from this spec, not by copying prototype code: the prototypes skip real data, server actions, Turnstile and the menus' keyboard handling.

## 1. Design language (unchanged)

Everything stays in the UI pass language. No new colours, fonts or icon sets.

- **Pages** are white. Each page starts with the blue header card from `BoardLayout`: `rounded-2xl border-2 border-foreground`, `shadow-[6px_6px_0_var(--foreground)]`.
- **Cards** are white with a 2px ink border and an offset shadow, `shadow-[5px_5px_0_var(--primary)]`, or red for destructive ones.
- **Buttons:** the main action is `INKED_BUTTON` (yellow). Secondary actions use `OUTLINE_BUTTON`, or `HEADER_BUTTON` on blue.
- **Headings** are `font-black`, with a handwritten yellow `NOTE` above section headings.
- **Drawings** sit on `PAPER` with a CSS pin (`.pinned` + `pinStyle`). The gold trophy is `/trophies/gold.webp`.
- **Icons** come from `@phosphor-icons/react`, `weight="bold"` (fill for trophy, crown and pinned).
- **Status colours** are fills only, each with an ink outline and always next to words:

  | Status | Fill | Words |
  | --- | --- | --- |
  | Draw today | `bg-winner` (yellow, like Draw) | "Draw today" |
  | Voting, you have votes left | `bg-primary` | "3 votes left" / "1 vote left" |
  | Monthly final open | `bg-attention` (orange) | "Final is open" |
  | Results you haven't seen | `bg-highlight` | "Results are in" |
  | Nothing waiting | no dot | last visit: "Today", "Yesterday", "3 days ago", "Last week" |

  If several apply, show the first in this order: final, vote, draw, results. The final is rarest and time-boxed.

## 2. The app shell

### Picks

**Sidebar variant A, a white inked card.** On a laptop it is a persistent column; on a phone it is a drawer from the left. Screenshots: `profiles/sidebar-a-*`.

### Layout

```
lg and up (>= 1024px)                       below lg
┌──────────┐ ┌──────────────────────────┐   ┌──────────────────────────┐
│ Sidebar  │ │ Blue header card         │   │ [≡] DrawPin       [pin]  │ ← inside the blue card
│ w-80     │ │                          │   │ Board name               │
│ sticky   │ └──────────────────────────┘   │ Hall of Fame      Draw   │
│ h-dvh    │   page content (max-w-6xl)     └──────────────────────────┘
│ py-6 pl-6│                                  page content
└──────────┘
```

- **`AppShell`** (new, `src/components/app-shell/app-shell.tsx`) wraps every page in the root layout, except the draw step and the print view (see below).
  - It renders `<div class="flex flex-1">`, holding the `<aside>` column (`hidden lg:block sticky top-0 h-dvh w-80 shrink-0 py-6 pl-6`) and a `min-w-0 flex-1` content column.
  - The sidebar card inside the column is `h-full overflow-y-auto overscroll-contain rounded-2xl border-2 border-foreground bg-white shadow-[6px_6px_0_var(--primary)]`. It scrolls on its own when it's taller than the window.
  - The shadow is blue, so it reads as a different object from the ink-shadowed blue header beside it.
- **Below `lg`**, no column is shown. The **menu button** (`MenuButton`) opens the drawer.
- **Where the button sits:**
  - On a page with the blue header, the header's first row replaces today's "← DrawPin" link with `[MenuButton] DrawPin`. That costs no extra height.
  - On a page with no blue header (draw, `CardPage` pages), the button goes in the page's own top row, on the right, in the white outline style (`tone="white"`).
  - On the marketing page, a slim white row sits above the poster: `[MenuButton] DrawPin`.
- **`BoardLayout`** loses its "← DrawPin" link (#168). On `lg` and up the header has no top row at all, because the sidebar is the way home.

### The drawer (phone and tablet)

- **Component:** use **Base UI `Drawer`** (`@base-ui/react/drawer`, already a dependency), with `swipeDirection="left"`. It provides the focus trap, Escape, `aria-modal`, focus return to the trigger, scroll lock and swipe-to-dismiss.
- **Size:** `w-[min(20rem,calc(100vw-3.5rem))]`, full height. A strip of page stays visible to tap closed.
- **Look:** `rounded-r-2xl border-2 border-l-0 border-foreground`, `shadow-[6px_0_0_var(--primary)]`. Padding includes `env(safe-area-inset-top/bottom)`.
- **Backdrop:** `bg-foreground/40`.
- **Opening:** only the menu button opens it. **No edge swipe area (`Drawer.SwipeArea`) anywhere.** The draw canvas owns horizontal drags, and so does iOS's back gesture. Swiping the open drawer left closes it.
- **Draw page** (`/b/[slug]/draw`): no sidebar column even on a laptop, and no swipe-in. The menu button sits top-right of the "Draw a tile" row (`profiles/header-draw-*`). With an unposted drawing, any sidebar link that leaves the page goes through the same "Leave without posting?" question as `BackToBoard` (reuse `useUnsavedDrawing`).
- **Print view** (`/admin/print`): no shell at all.
- **The drawer closes on navigation:** close it in the link's `onClick`, or on pathname change.

### Sidebar contents, top to bottom

`SidebarContents` is used by both the column and the drawer, so nothing is duplicated.

1. **Brand row:** "Draw**Pin**" (`text-2xl font-black tracking-tighter`, "Pin" in `text-primary`) links to `/`. In the drawer a 44px close button (X) sits on the right.
2. **You:**
   - Signed in: a 40px initial avatar (yellow fill, ink border) with **Name#tag** (the tag in grey) and "Your profile" under it. It links to `/me`.
   - Signed out: a light-blue box with the sentence "Sign in to keep your boards on every device, post your drawings and vote." and a full-width yellow **Sign in** button. The button opens the sign-in sheet (section 6).
3. **Home** (signed in only): House icon, links to the hub.
4. **Your boards**, or **On this device** when signed out: handwritten section label (`hand`, `text-xl font-bold`).
   - Pinned first, then by last visit. Show up to 8; after that, "All your boards" links to the hub's list.
   - Each `BoardRow` has:
     - a 40px thumbnail of the latest drawing (ink border, `rounded-md`);
     - the name (`text-[15px] font-bold`, truncated);
     - a filled PushPin when pinned;
     - line two: the status dot and words, then the **Owner** chip on boards you run;
     - a 44px "…" button on the right, which opens the row menu.
   - The board you're on gets `bg-secondary` and `aria-current="page"`.
   - Empty: a dashed box, "No boards yet. Scan a board's QR code, or type its code below."
5. **Have a code?**: a compact join. A code field plus a yellow **Open** button on one row, 44px tall.
6. **Boards you run** (only if you run one): the label, with "2 of 5" on the right. One Gear row per board links to `/admin/[slug]`, then **+ Start a board** (hidden at the cap).
   - If you run none, a single **+ Start a board** row sits here instead.
7. **Your drawings** (signed in): Images icon, links to `/me#drawings`.
8. **Footer** (`mt-auto`, a top rule): **Sign out** (signed in), then About · Terms · Privacy. These replace the root layout's footer links inside the shell.

Delete account is on the profile page only; it doesn't belong in the navigation.

### Row menu (pin and remove)

- **Component:** Base UI `Menu`. The trigger is the row's "…" button (`aria-label="More for {board}"`).
- **Popup:** `rounded-xl border-2 border-foreground bg-white p-1.5 shadow-[4px_4px_0_var(--primary)]`, items 44px tall.
- **Items:**
  - **Pin to the top** / **Unpin** (PushPin / PushPinSlash).
  - **Remove from my boards** (EyeSlash), with a small note under it: "It comes back if you open it again."
- **At the pin limit (5):** Pin is disabled, with the note "You can pin up to 5 boards."
- **After Remove:** the row leaves (no animation under reduced motion) and a toast says "Removed {board}." with **Undo** (Base UI `Toast`, 5 seconds).
- **Pin toggle in the board header:** `HEADER_BUTTON` with a PushPin icon, `aria-pressed`. It's white with a blue icon when pinned, reading "Pinned"; otherwise "Pin". On phones only the icon shows, with `aria-label` "Pin this board" / "Unpin this board".

### Components to build

| Component | Where | Props |
| --- | --- | --- |
| `AppShell` | `src/components/app-shell/app-shell.tsx` (server) | `children`, `chrome?: "full" \| "button-only" \| "none"` (draw = button-only, print = none) |
| `SidebarContents` | `…/sidebar-contents.tsx` | `viewer: { username, tag, initial } \| null`, `boards: SidebarBoard[]`, `runs: { slug, name }[]`, `cap: number`, `currentPath: string`, `onNavigate?()` |
| `SidebarDrawer` | `…/sidebar-drawer.tsx` (client) | `children` (the contents); exposes `MenuButton` via context |
| `MenuButton` | same | `tone: "blue" \| "white"` |
| `BoardRow` | `…/board-row.tsx` (client, for the menu) | `board: SidebarBoard`, `current: boolean` |
| `StatusLine` / `StatusDot` | `src/components/board-status.tsx` | `status: BoardStatus`, `votesLeft?`, `lastVisit` |
| `OwnerChip` | same file | none |
| `PinToggle` | `src/app/b/[slug]/pin-toggle.tsx` | `venueId`, `pinned` |
| `SignInSheet` | `src/components/sign-in-sheet.tsx` (client) | `next: string`, `open`, `onOpenChange` |

`SidebarBoard = { slug, name, latestImageUrl: string | null, status: BoardStatus, votesLeft?: number, pinned: boolean, owned: boolean, lastVisitedAt: string }`. With no drawings yet, `latestImageUrl` is null and the thumbnail is a white square holding a small ink pencil icon.

### States

- **Loading:**
  - The shell's data loads on the server with the page. Don't let it block the page: stream `SidebarContents` in a `Suspense`.
  - The fallback is the brand row plus three grey 40px skeleton rows (`bg-muted rounded-md`, no shimmer).
- **Error:** if the boards list fails, show the rest of the sidebar with "Couldn't load your boards." and a **Try again** text button. The page itself still renders.
- **Signed out:** see contents item 2. "On this device" comes from the device list; rows have the same menu, with Remove only (pinning needs an account).
- **Empty:** see item 4.

## 3. Landing

**Pick: the hub for a returning signed-in visitor, the marketing page for everyone else.**
- A signed-in visitor opening `/` sees the hub.
- A signed-out one sees today's home page with the sidebar.
- One constant decides it: `LANDING = "hub" | "marketing"` in `src/lib/landing.ts`. `"marketing"` gives everyone the marketing home.
- The marketing page stays reachable as `/about` (the sidebar's "About" link), so a signed-in person can still show a friend what DrawPin is.

### Home hub (`profiles/landing-hub-*`)

1. **Blue header:**
   - the date in the viewer's time zone (`text-sm font-bold text-white/85`);
   - "Hi, {name}." (`text-4xl sm:text-5xl font-black`);
   - a line counting what's waiting: "Four things are waiting on your boards." (one … nine in words, then digits), or "One thing is waiting on your boards.", or "You're all caught up. See you at tomorrow's drawing."
2. **Today** (`NOTE` "Today", heading "Waiting for you"):
   - **Layout:** a grid of `TodayCard`s, `sm:grid-cols-2 2xl:grid-cols-4`.
   - **Card:** a white inked card whose shadow takes the status colour (`5px 5px 0`). It holds the board name with a small icon, a `text-xl font-black` title, one muted line, and one button.
   - **The vote card** also fans three of last week's drawings (40px, slight leans, as in `VotePeek`).
   - **Order:** final, vote, draw, results.
   - **Hidden** entirely when nothing is waiting.
   - The four kinds are in the copy table below.
3. **Your boards** (`NOTE` "Pinned first", "Manage →" on the right, linking to the full list):
   - **`BoardCard`:** the latest three drawings as small pinned papers (`--pin-scale: 0.7`), then the name, PushPin if pinned, the Owner chip, "{n} drawings this week" and the status line.
   - **Phone:** a sideways scroll-snap row (`w-[78%]` cards, `snap-start`, no scrollbar). Peeking the next card shows it scrolls.
   - **`sm` and up:** a grid, 2 columns, then 3 from `xl`.
   - The whole card links to the board, and lifts and sinks like `VotePeek`.
4. **Have a code? / Start a board:** two cards side by side from `md`, the same as the marketing page's `Ending`.
   - "Have a code?" reuses `JoinForm`.
   - "Start a board" goes straight to `/setup` when signed in.
   - At the cap, the Start card reads "You run 5 boards, the most one account can." and has no button.

**States:**
- Loading: header plus skeleton cards.
- Error in one board's status: that card is skipped, never the whole hub.
- No boards at all: the Today section is hidden. Your boards shows the empty box, with the join card first.

### Marketing home with the sidebar (`profiles/landing-marketing-*`)

- Today's `/` page, unchanged, inside `AppShell` (signed-out sidebar on a laptop).
- On a phone, the slim `[≡] DrawPin` row sits above the poster.
- The "Start or manage a board" card's buttons go to `/setup` (signed in) or open the sign-in sheet, rather than `/login`.

## 4. Profile hub (`/me`, private; `profiles/profile-*`)

`/account` redirects to `/me`, keeping `next`.

1. **Blue header:**
   - a 64px initial avatar (yellow, ink border, `shadow-[3px_3px_0_var(--foreground)]`);
   - **Name#tag** (`text-4xl font-black`, the tag in `text-white/70`);
   - "Drawing since {Month Year}";
   - **Change your name** (`HEADER_BUTTON`, Pencil icon).
   - **Changing the name** happens inline in the header (`profiles/profile-change-name.webp`):
     - the label "Your name on the board", the field (max 24) and a yellow **Save**;
     - the hint "Your #{tag} stays the same. New names show on drawings you post from now on.";
     - moderation errors appear under the field as the existing username form shows them;
     - Escape cancels.
2. **Stats:**
   - **Layout:** a `<dl>` of four small inked cards (`grid-cols-2 md:grid-cols-4`, blue shadow), each a number (`text-4xl font-black`) over a label.
   - **Labels:** Drawings posted · Weekly wins · Super wins · Boards drawn on.
   - **Zero:** show `0`, never a dash.
3. **Your trophies** (`NOTE` "Kept forever"):
   - **The shelf:** each winning drawing stands as pinned paper on a plank, `border-b-[6px] border-foreground` plus `shadow-[0_6px_0_var(--primary)]`. The gold trophy sits on each drawing's corner.
   - **Under each drawing:** the label ("{Month}'s super winner" with an orange Crown, or "Week of {d Month}") and the board name.
   - **Layout:** items `w-40`, gap 8; scrolls sideways on a phone.
   - **Empty:** a dashed box, "No trophies yet. Win a week on any board and it's kept here forever."
4. **Your votes** (`NOTE` "This week"):
   - One inked list with a row per board where you can vote or have voted: "{n} of {m} cast · {note}".
   - The row's action is a small yellow **Vote →** when you have votes left, or "Done" in `text-success`.
   - **Notes:** "Voting closes {weekday}", "All your votes are in", "Your pick won last week".
   - **Hidden** when there's nothing to show.
   - It's the first thing to cut if time runs short.
5. **Your drawings** (`id="drawings"`, `NOTE` "Newest first"):
   - **Intro:** "Drawings that don't win are deleted 30 days after their week's voting ends, so save the ones you want. Winners are kept forever."
   - **Grouping:** one group per board, newest board activity first. Each group has an `h3` with the board name, an "Open →" link and an ink rule.
   - **Layout:** a grid, `grid-cols-2 sm:3 lg:4`.
   - **Each item:**
     - the drawing on `PAPER`, with the gold trophy if it won;
     - the handwritten caption;
     - the date posted;
     - "Kept until {d Month}", or the yellow chip "Winner · kept forever" / "Super winner · kept forever";
     - **Save as PNG** (outline, 44px).
   - **Empty:** "Nothing here yet. Drawings you post show up here."
6. **Your account:** the existing red-shadow card and Delete account link, unchanged.
   - **If you run boards,** add: "You run {n} boards. Closing your account closes them too." The delete flow (ADR-009/013 extension) owns the details.

## 5. Board runner

### `/admin`: Boards you run (`profiles/admin-list-*`)

- **With exactly one board,** `/admin` redirects to `/admin/[slug]`, as the plan says.
- **Header:** "{n} of 5" small over **Boards you run**, with the line "Each board has its own code, drawings and settings."
- **Layout:** content at `max-w-3xl`.
- **`RunCard`** per board:
  - three overlapping latest drawings (56px);
  - the name, `drawpin.io/b/{slug}`;
  - a status line: "{n} drawings this week", or a yellow dot with "Paused", plus an orange "{n} reported" chip when there are reports;
  - **Manage** (yellow, Gear) and an outline open-board icon button.
  - On a phone the buttons go under the text.
- **Under the cap:** a dashed **Start a board** card with a yellow plus tile and the line "Name it, pick its time zone, print the code. You can run {n} more."
- **At the cap** (`profiles/admin-list-at-cap-*`): no button. A dashed muted box: "**You run 5 boards, the most one account can.** To start another, close one you don't use any more. You can close a board from its settings."

### `/admin/[slug]`: board switcher (`profiles/admin-switcher-*`)

- **The trigger:** the board's name in the header is the switcher. It shows the small "Your board" label above it, the name (wrapping, never truncated) and a 36px caret tile. It's a Base UI `Menu` trigger.
- **The popup:**
  - "Switch board · {n} of 5";
  - one radio item per board (32px thumbnail, name, Check on the current one);
  - a rule;
  - **All your boards** (SquaresFour) and **Start a board** (hidden at the cap).
- **Switching** goes to the same admin section of the other board.
- **With one board,** it's plain text, not a menu.
- The admin's own content is unchanged.
- **Sign out** leaves the admin header; it lives in the sidebar now.

## 6. Universal sign-in sheet (`profiles/sign-in-sheet-*`)

- **Opened from:** the sidebar's **Sign in**, and anywhere today's `GoogleSignIn` shows ("Sign in" on the vote header, the account line, the draw page's post step).
- **Returns you** to `next`, the current path plus search, through `safeNextPath`. A post keeps its draft, as today.
- **Component:**
  - Base UI `Drawer` with `swipeDirection="down"`.
  - **Phone:** a bottom sheet (`rounded-t-2xl`, a grab handle, `max-h-[92dvh]`).
  - **`sm` and up:** a centred card, `max-w-sm rounded-2xl`, `shadow-[6px_6px_0_var(--primary)]`.
  - A 44px close button at the top right.
- **Step 1:**
  - `NOTE` "Sign in", then the title **Keep your boards in one place**;
  - the description "Post your drawings, vote, and find your boards on any device. Drawing for fun never needs it.";
  - **Continue with Google** (full width, outline, Google's own "G");
  - an "or" rule;
  - the label **Email**, the field, and a yellow **Email me a code**;
  - small print: "You'll come back to {board name}", or "You'll come back to this page" when not on a board.
  - Turnstile runs invisibly before the email is sent, as in `EmailSignIn` today.
- **Step 2:**
  - `NOTE` "Check your email", then **Type the code**;
  - "We sent a 6-digit code to **{email}**. It works for 1 hour.";
  - the `CodeInput` (reuse), a yellow **Sign in**, and the text button **Use a different email**.
  - The pending-email restore from `pending-email-code` keeps working: reopening the sheet within the window lands on step 2.
- **Errors:** under the field, `text-destructive`, with the same messages as `EmailSignIn` today.
- **Owners use this sheet too** (Google for owners, plan F). `/login` stays as a full page for links in emails, built from the same parts.
- **Reuse:** refactor `GoogleSignIn` and `EmailSignIn` so the sheet uses their actions and state. Add a `size="block"` option for the full-width Google button rather than forking the markup.

## 7. Responsive

| Width | Behaviour |
| --- | --- |
| < 640 (phone) | Drawer. Header row `[≡] DrawPin … [pin]`. Hub boards scroll sideways; Today cards stack. Sign-in is a bottom sheet. |
| 640–1023 | Drawer. Hub board grid has 2 columns; Today has 2 columns. Sign-in is a centred card. |
| ≥ 1024 (`lg`) | Persistent sidebar column `w-80`; no menu button; content beside it. |
| ≥ 1280 (`xl`) | Hub boards in 3 columns, board feed in 4. |
| ≥ 1536 (`2xl`) | Today cards in 4 columns. |

Content keeps today's `max-w-6xl`. With the sidebar, the board feed has about 900px at 1280, which still fits 4 drawings a row.

## 8. Motion

Keep it to what's there; everything respects reduced motion (`motion-reduce:transition-none`, and `motion-safe:` for keyframes).

- **Drawer:** slides in from the left, 300ms `cubic-bezier(0.32,0.72,0,1)`; the backdrop fades over the same time. Swiping follows the finger (`--drawer-swipe-movement-x`). Reduced motion: instant.
- **Sign-in sheet:**
  - phone: slides up, 300ms with the same curve;
  - `sm` and up: rises 16px and fades in;
  - reduced motion: instant.
- **Menus:** fade and scale from 0.96, 150ms ease-out, out at 100ms.
- **Cards:** the hub's board cards and the Today buttons lift and sink like `VotePeek` / `INKED_BUTTON`. Hover only on `(hover: hover)`.
- **Pins:** board cards' pins use the existing `pin-pop`, staggered 60ms, once on load.
- **Nothing else:** no new loops. The Draw card's pencil keeps `draw-awake`.

## 9. Accessibility

- **Landmarks:**
  - The sidebar is `<nav aria-label="DrawPin">`, with sections as `h2`.
  - The current page's link gets `aria-current="page"`.
  - The drawer has `Drawer.Title` "Menu" (visually hidden).
- **Drawer:**
  - Base UI traps focus, closes on Escape and the backdrop, and returns focus to the menu button.
  - The first focus goes to the close button.
  - The page behind is inert while it's open.
- **Menus:** Base UI `Menu` provides arrow keys, Home/End, typeahead and Escape. The switcher uses `menuitemradio` with `aria-checked`.
- **Touch targets** are at least 44px: every row, the "…" buttons, the menu items, Close, the footer links (`min-h-11`), and the hub and admin buttons (44–48px).
- **Status** is never colour alone: the dot is `aria-hidden` and the words carry it. The Owner chip is text.
- **PushPin:** the icon on a row is `aria-label="Pinned"`. The header toggle uses `aria-pressed`.
- **Images:**
  - board thumbnails in rows and cards are decorative (`alt=""`), since the name is right there;
  - drawings in "Your drawings" use the caption, or "Your drawing on {board}";
  - trophy shelf drawings: "Your winning drawing on {board}".
- **Stats** are a `<dl>`.
- **Contrast:** every text colour is from the palette's checked set. White on blue is at least `text-white/70`, used only for secondary text at 14px or larger.
- **Inputs** are 16px on touch (the global rule), so iOS doesn't zoom.

## 10. Copy

Plain, friendly, no exclamation marks, no long dashes. Says *board*, never assumes a business.

| Where | String |
| --- | --- |
| Menu button | aria: "Open menu"; close: "Close menu" |
| Brand | "DrawPin" |
| Signed-out box | "Sign in to keep your boards on every device, post your drawings and vote." / button "Sign in" |
| Profile row | "{Name}#{tag}" / "Your profile" |
| Nav | "Home", "Your drawings", "Start a board", "Sign out", "About", "Terms", "Privacy" |
| Section labels | "Your boards", "On this device", "Have a code?", "Boards you run" (+ "{n} of 5") |
| Status | "Draw today", "{n} votes left" / "1 vote left", "Final is open", "Results are in", "Today", "Yesterday", "{n} days ago", "Last week" |
| Owner chip | "Owner" |
| Row menu | aria "More for {board}"; "Pin to the top", "Unpin", "Remove from my boards", note "It comes back if you open it again.", at the limit "You can pin up to 5 boards." |
| Remove toast | "Removed {board}." / "Undo" |
| Empty boards | "No boards yet. Scan a board's QR code, or type its code below." |
| Join | placeholder "8-digit code", button "Open" (sidebar), "Open the board" (cards) |
| Board header pin | "Pin" / "Pinned"; aria "Pin this board" / "Unpin this board" |
| Hub header | "Hi, {name}." / "{Four} things are waiting on your boards." / "One thing is waiting on your boards." / "You're all caught up. See you at tomorrow's drawing." |
| Today: draw | kicker {board}; "Draw today"; "You haven't posted here today. A new day starts at 4:00 AM."; button "Draw" |
| Today: vote | "{n} votes left"; "Pick last week's best. Voting closes {weekday}."; "Vote" |
| Today: final | "The final is open"; "{Month}'s weekly winners face off. You get one vote."; "See the final" |
| Today: results | "Results are in"; "Last week's winner has been picked."; "See who won" |
| Hub boards | note "Pinned first"; "Your boards"; "Manage"; "{n} drawings this week" |
| Hub start card | "Start a board"; "For your team, your class or your friends. It's free, and you can run up to 5." |
| Profile | "Drawing since {Month Year}"; "Change your name"; "Your name on the board"; "Save"; "Your #{tag} stays the same. New names show on drawings you post from now on." |
| Stats | "Drawings posted", "Weekly wins", "Super wins", "Boards drawn on" |
| Trophies | note "Kept forever"; "Your trophies"; "{Month}'s super winner"; "Week of {d Month}"; empty "No trophies yet. Win a week on any board and it's kept here forever." |
| Votes | note "This week"; "Your votes"; "{n} of {m} cast · Voting closes {weekday}" / "All your votes are in" / "Your pick won last week"; "Vote"; "Done" |
| Drawings | note "Newest first"; "Your drawings"; intro as in §4; "Open"; "Kept until {d Month}"; "Winner · kept forever"; "Super winner · kept forever"; "Save as PNG" |
| Account | as today, plus "You run {n} boards. Closing your account closes them too." |
| Admin list | "{n} of 5"; "Boards you run"; "Each board has its own code, drawings and settings."; "Manage"; aria "Open {board}"; "{n} drawings this week"; "Paused"; "{n} reported"; "Start a board"; "Name it, pick its time zone, print the code. You can run {n} more." |
| At the cap | "You run 5 boards, the most one account can." / "To start another, close one you don't use any more. You can close a board from its settings." |
| Switcher | "Your board"; "Switch board · {n} of 5"; "All your boards"; "Start a board" |
| Sign-in sheet | "Sign in"; "Keep your boards in one place"; "Post your drawings, vote, and find your boards on any device. Drawing for fun never needs it."; "Continue with Google"; "or"; "Email"; "you@example.com"; "Email me a code"; "You'll come back to {board}." / "You'll come back to this page." |
| Sign-in code step | "Check your email"; "Type the code"; "We sent a 6-digit code to {email}. It works for 1 hour."; "Sign in"; "Use a different email" |
| Errors | "Couldn't load your boards." / "Try again" |

## 11. Reuse, don't rebuild

| Existing | Use it for |
| --- | --- |
| `BoardLayout`, `CardPage` (`board-look.tsx`) | Every page's header card. Drop the home link and add the `MenuButton` row. |
| `INKED_BUTTON`, `HEADER_BUTTON`, `PAPER`, `YELLOW_STRIP` | Buttons, paper, notes. |
| `NOTE`, `SECTION_TITLE`, `CARD_TITLE`, `OUTLINE_BUTTON` (`_home/type.ts`) | Section headings and secondary buttons. |
| `Button` (`components/ui/button.tsx`) | Any plain button. |
| `pinStyle`, `pinColorFor` (`components/pin.ts`) | The pins on hub board cards and trophies. |
| `PinnedDrawing`, `TileCaption` | Drawings with captions. |
| `TrophyBadge` (`_home/shared.tsx`) | Move to `src/components/` and use on the profile. |
| `JoinForm` (`join/join-form.tsx`) | Add `variant="compact"` (inline field + "Open") and a `useId` id, since two can be on one page. |
| `GoogleSignIn`, `EmailSignIn`, `CodeInput`, `Turnstile`, `pending-email-code` | The sign-in sheet. |
| `VotePeek`'s fan and lift | The hub's vote card and board cards. |
| `listMyDrawings`, `KEPT_FOR_DAYS` | Your drawings. |
| `BackToBoard` / `useUnsavedDrawing` | Guarding sidebar links on the draw page. |
| Base UI `Drawer`, `Menu`, `Toast` | Drawer and sheet, row menu and switcher, the Remove undo. |
