"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import {
  CaretDownIcon,
  CheckIcon,
  PlusIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { MAX_BOARDS_PER_ACCOUNT } from "@/lib/my-boards";
import { adminPath } from "./board-field";
import type { BoardSummary } from "./board-summaries";

/** A row in the popup: at least 44px tall, with a visible keyboard focus. */
const ITEM =
  "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 text-left text-sm font-bold outline-none data-[highlighted]:bg-secondary focus-visible:ring-highlight focus-visible:ring-3";

/**
 * The switcher between the boards an account runs (ADR-016, docs/design/
 * profiles.md, Board runner): the board's name in the header, which opens a
 * menu of the account's boards, "All your boards" and, while there's room,
 * "Start a board". A Base UI `Menu`, so it closes on an outside click or
 * Escape and has arrow keys, Home/End and typeahead.
 *
 * Only for an account with two or more boards; with one there's nowhere to
 * switch to, and the page shows the name as plain text.
 */
export function BoardSwitcher({
  current,
  boards,
}: {
  current: BoardSummary;
  /** Every board the account runs, the current one included. */
  boards: BoardSummary[];
}) {
  const router = useRouter();
  const canStart = boards.length < MAX_BOARDS_PER_ACCOUNT;

  return (
    <Menu.Root>
      <Menu.Trigger className="focus-visible:ring-highlight -ml-2 inline-flex w-fit max-w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-1 text-left outline-none hover:bg-white/10 focus-visible:ring-3 data-[popup-open]:bg-white/10">
        <span className="min-w-0 break-words">{current.name}</span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/35">
          <CaretDownIcon weight="bold" aria-hidden className="size-5" />
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" sideOffset={8} className="z-50">
          <Menu.Popup className="border-foreground text-foreground flex w-[min(20rem,calc(100vw-2.5rem))] origin-top flex-col rounded-xl border-2 bg-white p-1.5 shadow-[5px_5px_0_var(--foreground)] outline-none">
            <Menu.Group className="flex flex-col">
              <Menu.GroupLabel className="text-muted-foreground px-2.5 pt-1.5 pb-1 text-xs font-bold">
                Switch board · {boards.length} of {MAX_BOARDS_PER_ACCOUNT}
              </Menu.GroupLabel>
              <Menu.RadioGroup
                value={current.slug}
                onValueChange={(slug) => {
                  if (typeof slug === "string" && slug !== current.slug) {
                    router.push(adminPath(slug));
                  }
                }}
              >
                {boards.map((board) => (
                  <Menu.RadioItem
                    key={board.venueId}
                    value={board.slug}
                    label={board.name}
                    className={`${ITEM} data-[checked]:bg-secondary h-12`}
                  >
                    <BoardThumb url={board.thumbnails[0]} />
                    <span className="min-w-0 flex-1 break-words">
                      {board.name}
                    </span>
                    <Menu.RadioItemIndicator>
                      <CheckIcon
                        weight="bold"
                        aria-hidden
                        className="text-primary size-5"
                      />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Group>
            <div
              role="separator"
              className="bg-foreground/10 mx-2 my-1 h-0.5"
            />
            <Menu.LinkItem render={<Link href="/admin" />} className={ITEM}>
              <SquaresFourIcon weight="bold" aria-hidden className="size-5" />
              All your boards
            </Menu.LinkItem>
            {canStart && (
              <Menu.LinkItem render={<Link href="/setup" />} className={ITEM}>
                <PlusIcon weight="bold" aria-hidden className="size-5" />
                Start a board
              </Menu.LinkItem>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** A board's newest drawing at 32px, or an empty paper before it has one. */
function BoardThumb({ url }: { url: string | undefined }) {
  const frame =
    "border-foreground size-8 shrink-0 rounded-md border-2 bg-white";
  if (!url) return <span aria-hidden className={frame} />;
  return (
    <Image
      src={url}
      alt=""
      width={32}
      height={32}
      unoptimized
      className={`${frame} object-cover`}
    />
  );
}
