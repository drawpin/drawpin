"use client";

/**
 * PROTOTYPE ONLY (profiles design step, 2026-11-02): the page bodies that
 * sit inside the shell. Throwaway; see docs/design/profiles.md.
 */

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PencilSimpleIcon,
  PushPinIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import { HEADER_BUTTON, INKED_BUTTON } from "../../../b/[slug]/board-look";
import { PinnedDrawing } from "../../../b/[slug]/pinned-drawing";
import { NOTE } from "../../../_home/type";
import { BOARD_TILES } from "./data";
import { MenuButton } from "./shell";

/**
 * The blue header card every page in the shell starts with, as BoardLayout
 * has it today, with its "← DrawPin" row replaced by the phone's menu button
 * (hidden on a laptop, where the sidebar is always there).
 */
export function ShellHeader({
  children,
  aside,
}: {
  children: ReactNode;
  /** Top-right of the header, e.g. the board's pin toggle. */
  aside?: ReactNode;
}) {
  return (
    <div className="w-full px-3 pt-3 md:px-6 md:pt-6">
      <header className="bg-primary text-primary-foreground border-foreground rounded-2xl border-2 shadow-[6px_6px_0_var(--foreground)]">
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-6 md:px-8 md:py-8">
          <div className="-mx-1 -mt-2 flex items-center justify-between gap-3 lg:hidden">
            <div className="flex items-center gap-2">
              <MenuButton />
              <span className="text-lg font-black tracking-tighter">
                Draw<span className="text-winner">Pin</span>
              </span>
            </div>
            {aside}
          </div>
          {aside && (
            <div className="absolute top-6 right-6 hidden lg:block">
              {aside}
            </div>
          )}
          {children}
        </div>
      </header>
    </div>
  );
}

/** Pin or unpin this board, from its own header. */
export function PinToggle({ pinned }: { pinned: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pinned}
      aria-label={pinned ? "Unpin this board" : "Pin this board"}
      className={`${HEADER_BUTTON} aria-pressed:text-primary h-11 px-3 aria-pressed:bg-white`}
    >
      <PushPinIcon weight={pinned ? "fill" : "bold"} className="size-5" />
      <span className="hidden sm:inline">{pinned ? "Pinned" : "Pin"}</span>
    </button>
  );
}

/** A board page as it is today, inside the shell. */
export function BoardPageBody() {
  return (
    <>
      <ShellHeader aside={<PinToggle pinned />}>
        <div className="min-w-0">
          <h1 className="text-4xl leading-[1.02] font-black tracking-tight break-words">
            Office Doodles
          </h1>
          <p className="mt-1 text-sm text-white/85">
            14 drawings this week · 9 people
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Link href="#" className={HEADER_BUTTON}>
            <TrophyIcon weight="fill" className="text-winner size-5" />
            Hall of Fame
          </Link>
          <Link
            href="/prototype/profiles/draw"
            className={`draw-awake ${INKED_BUTTON}`}
          >
            <PencilSimpleIcon weight="bold" className="size-5" />
            Draw
          </Link>
        </div>
      </ShellHeader>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 pt-10 pb-6">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
          {BOARD_TILES.map((tile, index) => (
            <li key={tile.id}>
              <PinnedDrawing tile={tile} index={index} />
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}

/** The draw page: no sidebar column, the menu is only the button. */
export function DrawPageBody() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-3">
        <Link
          href="/prototype/profiles/board"
          aria-label="Back to the board"
          className="border-foreground hover:bg-secondary inline-flex size-11 shrink-0 items-center justify-center rounded-xl border-2 bg-white"
        >
          <ArrowLeftIcon weight="bold" className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Draw a tile
          </h1>
          <p className="text-muted-foreground truncate text-sm">
            Office Doodles
          </p>
        </div>
        <MenuButton tone="white" />
      </div>
      <div className="border-foreground relative aspect-square w-full rounded-xl border-2 bg-white">
        <Image
          src="/examples/windy-day.webp"
          alt=""
          fill
          unoptimized
          className="rounded-[10px] object-cover opacity-90"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        {["#0f1b2d", "#004aad", "#6badfa", "#ffca39", "#ff821b", "#c81e1e"].map(
          (color) => (
            <span
              key={color}
              className="border-foreground size-10 rounded-full border-2"
              style={{ background: color }}
            />
          ),
        )}
      </div>
      <div className="flex gap-3">
        <span className="border-foreground text-muted-foreground flex h-12 flex-1 items-center rounded-xl border-2 px-3 text-sm">
          Add a caption (optional)
        </span>
        <span className={INKED_BUTTON}>Post</span>
      </div>
    </main>
  );
}

/** A section heading with its handwritten note, as on the home page. */
export function SectionHead({
  note,
  title,
  action,
}: {
  note?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="flex flex-col items-start gap-2">
        {note && <p className={NOTE}>{note}</p>}
        <h2 className="text-2xl leading-tight font-black tracking-tight sm:text-3xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

/** A quiet "See all" style link beside a section heading. */
export function SideLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-primary inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-bold underline-offset-4 hover:underline"
    >
      {children}
      <ArrowRightIcon weight="bold" className="size-4" />
    </Link>
  );
}
