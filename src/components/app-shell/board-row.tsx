"use client";

import Image from "next/image";
import { Menu } from "@base-ui/react/menu";
import {
  DotsThreeIcon,
  EyeSlashIcon,
  PencilSimpleIcon,
  PushPinIcon,
  PushPinSlashIcon,
} from "@phosphor-icons/react";
import { OwnerChip, StatusLine } from "@/components/board-status";
import { MAX_PINNED_BOARDS } from "@/lib/my-boards";
import type { SidebarBoard } from "@/lib/sidebar-boards";
import { GuardedLink } from "./guarded-link";

const MENU_ITEM =
  "flex h-11 cursor-default items-center gap-2.5 rounded-lg px-2.5 text-sm font-bold outline-none select-none data-disabled:opacity-50 data-highlighted:bg-secondary";

/**
 * One of your boards in the sidebar: its latest drawing, name, pin, status
 * and owner chip, linking to the board, with a "…" menu to pin, unpin or
 * remove it. Signed out, the menu has Remove only: pinning needs an account.
 */
export function BoardRow({
  board,
  current,
  canPin,
  pinLimitReached,
  onPin,
  onUnpin,
  onRemove,
}: {
  board: SidebarBoard;
  /** The page is this board. */
  current: boolean;
  /** Signed in, so the menu offers Pin and Unpin. */
  canPin: boolean;
  /** The account already has {@link MAX_PINNED_BOARDS} pinned. */
  pinLimitReached: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onRemove: () => void;
}) {
  const pinned = board.pinnedAt !== null;
  return (
    <li>
      <div
        className={`flex items-center rounded-xl transition-colors duration-150 ease-out motion-reduce:transition-none ${current ? "bg-secondary" : "hover:bg-secondary"}`}
      >
        <GuardedLink
          href={`/b/${board.slug}`}
          aria-current={current ? "page" : undefined}
          className="focus-visible:ring-highlight flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl py-1.5 pl-2 outline-none focus-visible:ring-3"
        >
          {board.latestImageUrl ? (
            <Image
              src={board.latestImageUrl}
              alt=""
              width={40}
              height={40}
              unoptimized
              className="border-foreground size-10 shrink-0 rounded-md border-2 bg-white object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="border-foreground flex size-10 shrink-0 items-center justify-center rounded-md border-2 bg-white"
            >
              <PencilSimpleIcon weight="bold" className="size-4" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[15px] leading-tight font-bold">
                {board.name}
              </span>
              {pinned && (
                <PushPinIcon
                  weight="fill"
                  role="img"
                  aria-label="Pinned"
                  className="text-primary size-3.5 shrink-0"
                />
              )}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <StatusLine
                status={board.status}
                votesLeft={board.votesLeft}
                revealIds={board.revealIds}
                lastVisitedAt={board.lastVisitedAt}
              />
              {board.owned && <OwnerChip />}
            </span>
          </span>
        </GuardedLink>
        <Menu.Root>
          <Menu.Trigger
            aria-label={`More for ${board.name}`}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-highlight data-popup-open:text-foreground inline-flex size-11 shrink-0 items-center justify-center rounded-xl outline-none focus-visible:ring-3"
          >
            <DotsThreeIcon weight="bold" className="size-5" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner
              side="bottom"
              align="end"
              sideOffset={4}
              className="z-[60]"
            >
              <Menu.Popup className="border-foreground text-foreground flex w-60 origin-[var(--transform-origin)] flex-col rounded-xl border-2 bg-white p-1.5 shadow-[4px_4px_0_var(--primary)] transition-[transform,opacity] duration-150 ease-out outline-none data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-ending-style:duration-100 data-starting-style:scale-[0.96] data-starting-style:opacity-0 motion-reduce:transition-none">
                {canPin &&
                  (pinned ? (
                    <Menu.Item className={MENU_ITEM} onClick={onUnpin}>
                      <PushPinSlashIcon weight="bold" className="size-5" />
                      Unpin
                    </Menu.Item>
                  ) : (
                    <>
                      <Menu.Item
                        className={MENU_ITEM}
                        disabled={pinLimitReached}
                        onClick={onPin}
                      >
                        <PushPinIcon weight="bold" className="size-5" />
                        Pin to the top
                      </Menu.Item>
                      {pinLimitReached && (
                        <p className="text-muted-foreground px-2.5 pb-1.5 text-xs">
                          You can pin up to {MAX_PINNED_BOARDS} boards.
                        </p>
                      )}
                    </>
                  ))}
                <Menu.Item className={MENU_ITEM} onClick={onRemove}>
                  <EyeSlashIcon weight="bold" className="size-5" />
                  Remove from my boards
                </Menu.Item>
                <p className="text-muted-foreground px-2.5 pt-1 pb-1.5 text-xs">
                  It comes back if you open it again.
                </p>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </li>
  );
}
