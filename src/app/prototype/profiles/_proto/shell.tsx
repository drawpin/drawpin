"use client";

/**
 * PROTOTYPE ONLY (profiles design step, 2026-11-02): the app shell, the
 * sidebar in three variants and the phone drawer. Throwaway; the real build
 * follows docs/design/profiles.md.
 */

import {
  createContext,
  type ReactNode,
  useContext,
  useId,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { Drawer } from "@base-ui/react/drawer";
import {
  DotsThreeIcon,
  EyeSlashIcon,
  GearSixIcon,
  HouseIcon,
  ImagesIcon,
  ListIcon,
  PlusIcon,
  PushPinIcon,
  PushPinSlashIcon,
  SignOutIcon,
  XIcon,
} from "@phosphor-icons/react";
import { hand } from "@/lib/fonts";
import { BOARD_CAP, type BoardStatus, ME, type ProtoBoard } from "./data";

export type Variant = "a" | "b" | "c";
export type Who = "out" | "in" | "runner";

const OpenContext = createContext<() => void>(() => {});

/** The phone header's menu button: the only way into the drawer. */
export function MenuButton({ tone = "blue" }: { tone?: "blue" | "white" }) {
  const open = useContext(OpenContext);
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open menu"
      className={
        tone === "blue"
          ? "focus-visible:ring-highlight inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/35 outline-none hover:bg-white/25 focus-visible:ring-3 lg:hidden"
          : "border-foreground hover:bg-secondary focus-visible:ring-highlight inline-flex size-11 shrink-0 items-center justify-center rounded-xl border-2 bg-white outline-none focus-visible:ring-3"
      }
    >
      <ListIcon weight="bold" className="size-6" />
    </button>
  );
}

const STATUS: Record<
  Exclude<BoardStatus, null>,
  { dot: string; text: (board: ProtoBoard) => string }
> = {
  draw: { dot: "bg-winner", text: () => "Draw today" },
  vote: {
    dot: "bg-primary",
    text: (board) =>
      `${board.votesLeft} ${board.votesLeft === 1 ? "vote" : "votes"} left`,
  },
  final: { dot: "bg-attention", text: () => "Final is open" },
  results: { dot: "bg-highlight", text: () => "Results are in" },
};

/** The status dot and its words: never the colour alone. */
export function StatusLine({
  board,
  tone = "white",
}: {
  board: ProtoBoard;
  tone?: "white" | "blue";
}) {
  if (!board.status) {
    return (
      <span
        className={`block truncate text-xs ${tone === "blue" ? "text-white/70" : "text-muted-foreground"}`}
      >
        {board.lastVisit}
      </span>
    );
  }
  const status = STATUS[board.status];
  return (
    <span
      className={`flex items-center gap-1.5 text-xs font-semibold ${tone === "blue" ? "text-white" : "text-foreground"}`}
    >
      <span
        aria-hidden
        className={`border-foreground size-2.5 shrink-0 rounded-full border-2 ${status.dot} ${tone === "blue" ? "border-white" : ""}`}
      />
      {status.text(board)}
    </span>
  );
}

/** The small chip on a board you run. */
export function OwnerChip({ tone = "white" }: { tone?: "white" | "blue" }) {
  return (
    <span
      className={`shrink-0 rounded-md border-2 px-1.5 text-[11px] leading-4 font-bold ${tone === "blue" ? "border-white text-white" : "border-foreground bg-secondary"}`}
    >
      Owner
    </span>
  );
}

function SectionLabel({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "white" | "blue";
}) {
  return (
    <h2
      className={`${hand.className} px-2 text-xl leading-none font-bold ${tone === "blue" ? "text-winner" : "text-foreground"}`}
    >
      {children}
    </h2>
  );
}

const ROW =
  "focus-visible:ring-highlight flex min-h-11 items-center gap-3 rounded-xl px-2 outline-none focus-visible:ring-3";

function NavLink({
  href,
  icon,
  children,
  tone,
  current = false,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  tone: "white" | "blue";
  current?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`${ROW} text-[15px] font-bold ${tone === "blue" ? "hover:bg-white/15 aria-[current=page]:bg-white/20" : "hover:bg-secondary aria-[current=page]:bg-secondary"}`}
    >
      <span className="flex size-6 items-center justify-center">{icon}</span>
      {children}
    </Link>
  );
}

/** One of your boards: its latest drawing, name, status, owner chip, menu. */
function BoardRow({
  board,
  tone,
  menuOpen,
  thumbs,
}: {
  board: ProtoBoard;
  tone: "white" | "blue";
  menuOpen: boolean;
  thumbs: boolean;
}) {
  return (
    <li className="relative">
      <div
        className={`group flex items-center rounded-xl ${tone === "blue" ? "hover:bg-white/15" : "hover:bg-secondary"} ${board.slug === "office-doodles" ? (tone === "blue" ? "bg-white/20" : "bg-secondary") : ""}`}
      >
        <Link
          href="/prototype/profiles/board"
          className={`${ROW} min-w-0 flex-1 py-1.5 pr-0`}
        >
          {thumbs && (
            <Image
              src={board.latest[0]}
              alt=""
              width={40}
              height={40}
              unoptimized
              className={`size-10 shrink-0 rounded-md border-2 bg-white object-cover ${tone === "blue" ? "border-white" : "border-foreground"}`}
            />
          )}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[15px] leading-tight font-bold">
                {board.name}
              </span>
              {board.pinned && (
                <PushPinIcon
                  weight="fill"
                  aria-label="Pinned"
                  className={`size-3.5 shrink-0 ${tone === "blue" ? "text-winner" : "text-primary"}`}
                />
              )}
            </span>
            <span className="flex items-center gap-2">
              <StatusLine board={board} tone={tone} />
              {board.owned && <OwnerChip tone={tone} />}
            </span>
          </span>
        </Link>
        <button
          type="button"
          aria-label={`More for ${board.name}`}
          aria-expanded={menuOpen}
          className={`focus-visible:ring-highlight inline-flex size-11 shrink-0 items-center justify-center rounded-xl outline-none focus-visible:ring-3 ${tone === "blue" ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
        >
          <DotsThreeIcon weight="bold" className="size-5" />
        </button>
      </div>
      {menuOpen && (
        <div
          role="menu"
          className="border-foreground text-foreground absolute top-12 right-1 z-20 flex w-60 flex-col rounded-xl border-2 bg-white p-1.5 shadow-[4px_4px_0_var(--primary)]"
        >
          <button
            type="button"
            role="menuitem"
            className="hover:bg-secondary flex h-11 items-center gap-2.5 rounded-lg px-2.5 text-sm font-bold"
          >
            {board.pinned ? (
              <PushPinSlashIcon weight="bold" className="size-5" />
            ) : (
              <PushPinIcon weight="bold" className="size-5" />
            )}
            {board.pinned ? "Unpin" : "Pin to the top"}
          </button>
          <button
            type="button"
            role="menuitem"
            className="hover:bg-secondary flex h-11 items-center gap-2.5 rounded-lg px-2.5 text-sm font-bold"
          >
            <EyeSlashIcon weight="bold" className="size-5" />
            Remove from my boards
          </button>
          <p className="text-muted-foreground px-2.5 pt-1 pb-1.5 text-xs">
            It comes back if you open it again.
          </p>
        </div>
      )}
    </li>
  );
}

/** The compact join: the 8-digit code and an arrow. */
function JoinRow({ tone }: { tone: "white" | "blue" }) {
  const id = useId();
  return (
    <form className="flex gap-2 px-1" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor={id} className="sr-only">
        Board code
      </label>
      <input
        id={id}
        inputMode="numeric"
        placeholder="8-digit code"
        className={`h-11 w-full min-w-0 rounded-xl border-2 px-3 text-center font-bold tracking-[0.15em] outline-none placeholder:font-semibold placeholder:tracking-normal focus-visible:ring-3 ${tone === "blue" ? "focus-visible:ring-winner text-foreground border-white bg-white" : "border-foreground focus-visible:ring-highlight bg-white"}`}
      />
      <button
        type="submit"
        className="border-foreground bg-winner focus-visible:ring-highlight inline-flex h-11 shrink-0 items-center rounded-xl border-2 px-3 text-sm font-extrabold shadow-[3px_3px_0_var(--foreground)] outline-none focus-visible:ring-3 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      >
        Open
      </button>
    </form>
  );
}

export type SidebarProps = {
  who: Who;
  boards: ProtoBoard[];
  runs: ProtoBoard[];
  menuFor?: string | null;
  current?: "home" | "profile" | "drawings" | "admin" | "board";
  tone?: "white" | "blue";
  thumbs?: boolean;
  onClose?: () => void;
  onSignIn?: () => void;
};

/** Everything in the sidebar, for the desktop column and the phone drawer. */
export function SidebarContents({
  who,
  boards,
  runs,
  menuFor = null,
  current,
  tone = "white",
  thumbs = true,
  onClose,
  onSignIn,
}: SidebarProps) {
  const signedIn = who !== "out";
  const quiet = tone === "blue" ? "text-white/75" : "text-muted-foreground";

  return (
    <nav aria-label="DrawPin" className="flex min-h-full flex-col gap-5 p-3">
      <div className="flex items-center justify-between gap-2 pl-2">
        <Link
          href="/prototype/profiles/hub"
          className="focus-visible:ring-highlight rounded-lg text-2xl font-black tracking-tighter outline-none focus-visible:ring-3"
        >
          Draw
          <span className={tone === "blue" ? "text-winner" : "text-primary"}>
            Pin
          </span>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className={`focus-visible:ring-highlight inline-flex size-11 items-center justify-center rounded-xl outline-none focus-visible:ring-3 ${tone === "blue" ? "hover:bg-white/15" : "hover:bg-secondary"}`}
          >
            <XIcon weight="bold" className="size-6" />
          </button>
        )}
      </div>

      {signedIn ? (
        <Link
          href="/prototype/profiles/me"
          aria-current={current === "profile" ? "page" : undefined}
          className={`${ROW} py-2 ${tone === "blue" ? "hover:bg-white/15" : "hover:bg-secondary"}`}
        >
          <span
            aria-hidden
            className="border-foreground bg-winner text-foreground flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-lg font-black"
          >
            {ME.initial}
          </span>
          <span className="min-w-0">
            <span className="block truncate leading-tight font-bold">
              {ME.name}
              <span className={`font-medium ${quiet}`}>#{ME.tag}</span>
            </span>
            <span className={`block text-xs ${quiet}`}>Your profile</span>
          </span>
        </Link>
      ) : (
        <div
          className={`flex flex-col gap-3 rounded-xl border-2 p-3 ${tone === "blue" ? "border-white/60" : "border-foreground bg-secondary"}`}
        >
          <p className="text-sm leading-snug font-semibold">
            Sign in to keep your boards on every device, post your drawings and
            vote.
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="border-foreground bg-winner text-foreground focus-visible:ring-highlight inline-flex h-11 items-center justify-center rounded-xl border-2 font-extrabold shadow-[3px_3px_0_var(--foreground)] outline-none focus-visible:ring-3 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            Sign in
          </button>
        </div>
      )}

      {signedIn && (
        <div className="-mt-2 flex flex-col">
          <NavLink
            href="/prototype/profiles/hub"
            icon={<HouseIcon weight="bold" className="size-5" />}
            tone={tone}
            current={current === "home"}
          >
            Home
          </NavLink>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <SectionLabel tone={tone}>
          {signedIn ? "Your boards" : "On this device"}
        </SectionLabel>
        {boards.length === 0 ? (
          <p
            className={`rounded-xl border-2 border-dashed px-3 py-3 text-sm ${tone === "blue" ? "border-white/50" : "border-foreground/40"} ${quiet}`}
          >
            No boards yet. Scan a board&apos;s QR code, or type its code below.
          </p>
        ) : (
          <ul className="flex flex-col">
            {boards.map((board) => (
              <BoardRow
                key={board.slug}
                board={board}
                tone={tone}
                thumbs={thumbs}
                menuOpen={menuFor === board.slug}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel tone={tone}>Have a code?</SectionLabel>
        <JoinRow tone={tone} />
      </section>

      {who === "runner" ? (
        <section className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between pr-2">
            <SectionLabel tone={tone}>Boards you run</SectionLabel>
            <span className={`text-xs font-semibold ${quiet}`}>
              {runs.length} of {BOARD_CAP}
            </span>
          </div>
          <ul className="mt-1 flex flex-col">
            {runs.map((board) => (
              <li key={board.slug}>
                <NavLink
                  href="/prototype/profiles/admin/board"
                  icon={<GearSixIcon weight="bold" className="size-5" />}
                  tone={tone}
                >
                  <span className="truncate">{board.name}</span>
                </NavLink>
              </li>
            ))}
            {runs.length < BOARD_CAP && (
              <li>
                <NavLink
                  href="/prototype/profiles/admin"
                  icon={<PlusIcon weight="bold" className="size-5" />}
                  tone={tone}
                >
                  Start a board
                </NavLink>
              </li>
            )}
          </ul>
        </section>
      ) : (
        <NavLink
          href="/prototype/profiles/admin"
          icon={<PlusIcon weight="bold" className="size-5" />}
          tone={tone}
        >
          Start a board
        </NavLink>
      )}

      {signedIn && (
        <div className="-mt-3 flex flex-col">
          <NavLink
            href="/prototype/profiles/me#drawings"
            icon={<ImagesIcon weight="bold" className="size-5" />}
            tone={tone}
            current={current === "drawings"}
          >
            Your drawings
          </NavLink>
        </div>
      )}

      <div
        className={`mt-auto flex flex-wrap items-center gap-x-3 border-t-2 px-2 pt-2 text-xs ${tone === "blue" ? "border-white/25" : "border-foreground/10"} ${quiet}`}
      >
        {signedIn && (
          <button
            type="button"
            className="hover:text-foreground inline-flex min-h-11 items-center gap-1.5 font-semibold"
          >
            <SignOutIcon weight="bold" className="size-4" />
            Sign out
          </button>
        )}
        <Link
          href="/"
          className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
        >
          About
        </Link>
        <Link
          href="/terms"
          className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
        >
          Terms
        </Link>
        <Link
          href="/privacy"
          className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
        >
          Privacy
        </Link>
      </div>
    </nav>
  );
}

/**
 * Variant C's desktop rail: your boards as their latest drawings, with the
 * status dot on the corner. Names show on hover and to screen readers.
 */
function BoardRail({ who, boards, runs }: SidebarProps) {
  return (
    <nav
      aria-label="DrawPin"
      className="border-foreground flex h-full flex-col items-center gap-3 overflow-y-auto rounded-2xl border-2 bg-white py-3 shadow-[6px_6px_0_var(--primary)]"
    >
      <Link
        href="/prototype/profiles/hub"
        aria-label="Home"
        className="bg-primary border-foreground flex size-11 items-center justify-center rounded-xl border-2 text-lg font-black text-white"
      >
        D
      </Link>
      {who !== "out" && (
        <Link
          href="/prototype/profiles/me"
          aria-label="Your profile"
          className="border-foreground bg-winner flex size-11 items-center justify-center rounded-full border-2 font-black"
        >
          {ME.initial}
        </Link>
      )}
      <span aria-hidden className="bg-foreground/15 h-0.5 w-8" />
      <ul className="flex flex-col items-center gap-3">
        {boards.map((board, index) => (
          <li key={board.slug} className="relative">
            <Link
              href="/prototype/profiles/board"
              title={board.name}
              aria-label={board.name}
              className="block"
            >
              <Image
                src={board.latest[0]}
                alt=""
                width={48}
                height={48}
                unoptimized
                style={{ rotate: `${[-3, 2, -1.5, 2.5, -2][index % 5]}deg` }}
                className={`size-12 rounded-md border-2 bg-white object-cover ${index === 0 ? "border-primary ring-primary ring-2" : "border-foreground"}`}
              />
            </Link>
            {board.status && (
              <span
                aria-hidden
                className={`border-foreground absolute -top-1 -right-1 size-3.5 rounded-full border-2 ${STATUS[board.status].dot}`}
              />
            )}
            {board.owned && (
              <span
                aria-hidden
                className="border-foreground absolute -bottom-1 -left-1 rounded border-2 bg-white px-0.5 text-[9px] leading-3 font-black"
              >
                <GearSixIcon weight="bold" className="size-2.5" />
              </span>
            )}
          </li>
        ))}
      </ul>
      <span aria-hidden className="bg-foreground/15 h-0.5 w-8" />
      <button
        type="button"
        aria-label="Open a board with its code"
        className="border-foreground hover:bg-secondary flex size-11 items-center justify-center rounded-xl border-2 border-dashed font-black"
      >
        #
      </button>
      {who === "runner" && runs.length < BOARD_CAP && (
        <Link
          href="/prototype/profiles/admin"
          aria-label="Start a board"
          className="border-foreground hover:bg-secondary flex size-11 items-center justify-center rounded-xl border-2"
        >
          <PlusIcon weight="bold" className="size-5" />
        </Link>
      )}
    </nav>
  );
}

/**
 * The shell every page sits in: a sidebar column on a laptop, a drawer from
 * the header's menu button on a phone. `persistent={false}` is the draw page:
 * no column, no swipe-in, only the button.
 */
export function AppShell({
  variant = "a",
  defaultOpen = false,
  persistent = true,
  children,
  ...sidebar
}: SidebarProps & {
  variant?: Variant;
  defaultOpen?: boolean;
  persistent?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const tone = variant === "b" ? "blue" : "white";
  const sheet = variant === "c";

  const panel =
    tone === "blue"
      ? "bg-primary text-primary-foreground border-foreground"
      : "border-foreground bg-white text-foreground";

  return (
    <OpenContext.Provider value={() => setOpen(true)}>
      <div className="flex flex-1">
        {persistent && (
          <aside
            className={`sticky top-0 hidden h-dvh shrink-0 py-6 pl-6 lg:block ${variant === "c" ? "w-[6.5rem]" : "w-80"}`}
          >
            {variant === "c" ? (
              <BoardRail {...sidebar} />
            ) : (
              <div
                className={`h-full overflow-y-auto overscroll-contain rounded-2xl border-2 ${panel} ${tone === "blue" ? "shadow-[6px_6px_0_var(--foreground)]" : "shadow-[6px_6px_0_var(--primary)]"}`}
              >
                <SidebarContents {...sidebar} tone={tone} />
              </div>
            )}
          </aside>
        )}
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>

      <Drawer.Root
        open={open}
        onOpenChange={setOpen}
        swipeDirection={sheet ? "down" : "left"}
      >
        <Drawer.Portal>
          <Drawer.Backdrop className="bg-foreground/40 fixed inset-0 z-40 transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
          <Drawer.Viewport
            className={`fixed inset-0 z-50 flex ${sheet ? "items-end justify-center" : "items-stretch justify-start"}`}
          >
            <Drawer.Popup
              className={
                sheet
                  ? `border-foreground max-h-[88dvh] w-full max-w-lg [transform:translateY(var(--drawer-swipe-movement-y))] overflow-y-auto overscroll-contain rounded-t-2xl border-2 border-b-0 bg-white pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)] motion-reduce:transition-none`
                  : `${panel} h-full w-[min(20rem,calc(100vw-3.5rem))] [transform:translateX(var(--drawer-swipe-movement-x))] overflow-y-auto overscroll-contain rounded-r-2xl border-2 border-l-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-ending-style:[transform:translateX(-100%)] data-starting-style:[transform:translateX(-100%)] motion-reduce:transition-none ${tone === "blue" ? "shadow-[6px_0_0_var(--foreground)]" : "shadow-[6px_0_0_var(--primary)]"}`
              }
            >
              {sheet && (
                <span
                  aria-hidden
                  className="bg-foreground/25 mx-auto mt-2 block h-1.5 w-10 rounded-full"
                />
              )}
              <Drawer.Title className="sr-only">Menu</Drawer.Title>
              <SidebarContents
                {...sidebar}
                tone={tone}
                onClose={() => setOpen(false)}
              />
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </OpenContext.Provider>
  );
}
