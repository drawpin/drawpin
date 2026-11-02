"use client";

import type { ReactNode } from "react";
import {
  GearSixIcon,
  HouseIcon,
  ImagesIcon,
  PlusIcon,
  SignOutIcon,
  XIcon,
} from "@phosphor-icons/react";
import { JoinForm } from "@/app/join/join-form";
import { signOutCustomer } from "@/app/auth/customer-actions";
import { hand } from "@/lib/fonts";
import { MAX_PINNED_BOARDS } from "@/lib/my-boards";
import type { SidebarBoard } from "@/lib/sidebar-boards";
import { BoardRow } from "./board-row";
import { boardSlugFromPath } from "./chrome";
import { GuardedLink } from "./guarded-link";
import type { SidebarData } from "./load-sidebar";
import { ABOUT_HREF, ALL_BOARDS_HREF, HOME_HREF } from "./links";

/** How many boards the sidebar lists before "All your boards". */
const SIDEBAR_BOARDS = 8;

const ROW =
  "focus-visible:ring-highlight flex min-h-11 items-center gap-3 rounded-xl px-2 outline-none focus-visible:ring-3";

const FOOTER_LINK =
  "hover:text-foreground inline-flex min-h-11 items-center underline-offset-4 hover:underline";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2
      className={`${hand.className} text-foreground px-2 text-xl leading-none font-bold`}
    >
      {children}
    </h2>
  );
}

function NavLink({
  href,
  icon,
  current = false,
  children,
}: {
  href: string;
  icon: ReactNode;
  current?: boolean;
  children: ReactNode;
}) {
  return (
    <GuardedLink
      href={href}
      aria-current={current ? "page" : undefined}
      className={`${ROW} hover:bg-secondary aria-[current=page]:bg-secondary text-[15px] font-bold transition-colors duration-150 ease-out motion-reduce:transition-none`}
    >
      <span className="flex size-6 shrink-0 items-center justify-center">
        {icon}
      </span>
      {children}
    </GuardedLink>
  );
}

/** What a row's menu does, handed down from the sidebar's state. */
export type BoardHandlers = {
  onPin: (board: SidebarBoard) => void;
  onUnpin: (board: SidebarBoard) => void;
  onRemove: (board: SidebarBoard) => void;
  onRetry: () => void;
};

/**
 * Everything in the sidebar, top to bottom (docs/design/profiles.md, section
 * 2), for both the laptop column and the phone drawer.
 *
 * @param onClose - Shows the drawer's close button; the column has none.
 */
export function SidebarContents({
  data,
  boards,
  currentPath,
  handlers,
  onClose,
}: {
  data: SidebarData;
  /** The boards as they are now, after any pin, remove or visit. */
  boards: SidebarBoard[];
  currentPath: string;
  handlers: BoardHandlers;
  onClose?: () => void;
}) {
  const { signedIn, viewer, runs, cap } = data;
  const currentSlug = boardSlugFromPath(currentPath);
  const pinnedCount = boards.filter((board) => board.pinnedAt).length;
  const shown = boards.slice(0, SIDEBAR_BOARDS);
  const startHref = "/setup";

  return (
    <nav aria-label="DrawPin" className="flex min-h-full flex-col gap-5 p-3">
      <div className="flex items-center justify-between gap-2 pl-2">
        <GuardedLink
          href={HOME_HREF}
          className="focus-visible:ring-highlight rounded-lg text-2xl font-black tracking-tighter outline-none focus-visible:ring-3"
        >
          Draw<span className="text-primary">Pin</span>
        </GuardedLink>
        {onClose && (
          <button
            type="button"
            data-drawer-close
            onClick={onClose}
            aria-label="Close menu"
            className="hover:bg-secondary focus-visible:ring-highlight inline-flex size-11 items-center justify-center rounded-xl outline-none focus-visible:ring-3"
          >
            <XIcon weight="bold" className="size-6" />
          </button>
        )}
      </div>

      {signedIn ? (
        viewer ? (
          <GuardedLink
            href="/me"
            aria-current={currentPath === "/me" ? "page" : undefined}
            className={`${ROW} hover:bg-secondary aria-[current=page]:bg-secondary py-2`}
          >
            <span
              aria-hidden
              className="border-foreground bg-winner text-foreground flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-lg font-black"
            >
              {viewer.initial}
            </span>
            <span className="min-w-0">
              <span className="block truncate leading-tight font-bold">
                {viewer.username}
                <span className="text-muted-foreground font-medium">
                  #{viewer.tag}
                </span>
              </span>
              <span className="text-muted-foreground block text-xs">
                Your profile
              </span>
            </span>
          </GuardedLink>
        ) : null
      ) : (
        <div className="border-foreground bg-secondary flex flex-col gap-3 rounded-xl border-2 p-3">
          <p className="text-sm leading-snug font-semibold">
            Sign in to keep your boards on every device, post your drawings and
            vote.
          </p>
          {/* The sign-in sheet replaces this link (section 6). */}
          <GuardedLink
            href={`/login?next=${encodeURIComponent(currentPath)}`}
            className="border-foreground bg-winner text-foreground focus-visible:ring-highlight inline-flex h-11 items-center justify-center rounded-xl border-2 font-extrabold shadow-[3px_3px_0_var(--foreground)] outline-none focus-visible:ring-3 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            Sign in
          </GuardedLink>
        </div>
      )}

      {signedIn && (
        <div className="-mt-2 flex flex-col">
          <NavLink
            href={HOME_HREF}
            icon={<HouseIcon weight="bold" className="size-5" />}
            current={currentPath === HOME_HREF}
          >
            Home
          </NavLink>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <SectionLabel>
          {signedIn ? "Your boards" : "On this device"}
        </SectionLabel>
        {data.boardsFailed ? (
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 px-2 text-sm">
            Couldn&apos;t load your boards.
            <button
              type="button"
              onClick={handlers.onRetry}
              className="text-primary inline-flex min-h-11 items-center font-bold underline-offset-4 hover:underline"
            >
              Try again
            </button>
          </p>
        ) : shown.length === 0 ? (
          <p className="border-foreground/40 text-muted-foreground rounded-xl border-2 border-dashed px-3 py-3 text-sm">
            No boards yet. Scan a board&apos;s QR code, or type its code below.
          </p>
        ) : (
          <ul className="flex flex-col">
            {shown.map((board) => (
              <BoardRow
                key={board.venueId}
                board={board}
                current={board.slug === currentSlug}
                canPin={signedIn}
                pinLimitReached={pinnedCount >= MAX_PINNED_BOARDS}
                onPin={() => handlers.onPin(board)}
                onUnpin={() => handlers.onUnpin(board)}
                onRemove={() => handlers.onRemove(board)}
              />
            ))}
          </ul>
        )}
        {signedIn && boards.length > SIDEBAR_BOARDS && (
          <GuardedLink
            href={ALL_BOARDS_HREF}
            className="text-primary inline-flex min-h-11 items-center px-2 text-sm font-bold underline-offset-4 hover:underline"
          >
            All your boards
          </GuardedLink>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Have a code?</SectionLabel>
        <div className="px-1">
          <JoinForm variant="compact" />
        </div>
      </section>

      {runs.length > 0 ? (
        <section className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between pr-2">
            <SectionLabel>Boards you run</SectionLabel>
            <span className="text-muted-foreground text-xs font-semibold">
              {runs.length} of {cap}
            </span>
          </div>
          <ul className="mt-1 flex flex-col">
            {runs.map((board) => {
              const href = `/admin/${board.slug}`;
              return (
                <li key={board.slug}>
                  <NavLink
                    href={href}
                    icon={<GearSixIcon weight="bold" className="size-5" />}
                    current={
                      currentPath === href || currentPath.startsWith(`${href}/`)
                    }
                  >
                    <span className="truncate">{board.name}</span>
                  </NavLink>
                </li>
              );
            })}
            {runs.length < cap && (
              <li>
                <NavLink
                  href={startHref}
                  icon={<PlusIcon weight="bold" className="size-5" />}
                >
                  Start a board
                </NavLink>
              </li>
            )}
          </ul>
        </section>
      ) : (
        <NavLink
          href={startHref}
          icon={<PlusIcon weight="bold" className="size-5" />}
          current={currentPath === startHref}
        >
          Start a board
        </NavLink>
      )}

      {signedIn && (
        <div className="-mt-3 flex flex-col">
          <NavLink
            href="/me#drawings"
            icon={<ImagesIcon weight="bold" className="size-5" />}
          >
            Your drawings
          </NavLink>
        </div>
      )}

      <div className="border-foreground/10 text-muted-foreground mt-auto flex flex-wrap items-center gap-x-3 border-t-2 px-2 pt-2 text-xs">
        {signedIn && (
          <form action={signOutCustomer}>
            <input type="hidden" name="next" value={currentPath} />
            <button
              type="submit"
              className="hover:text-foreground inline-flex min-h-11 items-center gap-1.5 font-semibold"
            >
              <SignOutIcon weight="bold" className="size-4" />
              Sign out
            </button>
          </form>
        )}
        <GuardedLink href={ABOUT_HREF} className={FOOTER_LINK}>
          About
        </GuardedLink>
        <GuardedLink href="/terms" className={FOOTER_LINK}>
          Terms
        </GuardedLink>
        <GuardedLink href="/privacy" className={FOOTER_LINK}>
          Privacy
        </GuardedLink>
      </div>
    </nav>
  );
}
