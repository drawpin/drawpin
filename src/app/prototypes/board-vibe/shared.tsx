"use client";

import {
  ArrowRightIcon,
  PencilSimpleIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { type ReactNode, useState } from "react";
import { TileCaption } from "./caption";
import { BOARD, leanFor, PEEK, type ProtoTile } from "./data";
import { hand } from "./fonts";
import { Lightbox, LIGHTBOX_CSS } from "./lightbox";
import { MOTION_CSS } from "./motion";
import { PIN_CSS, pinStyle, TACK_COLORS } from "./pin";

/**
 * What every direction keeps, as agreed by 2026-10-02: the palette, the blue
 * header with Draw and the Hall of Fame, the vote card and its motion, the
 * flat ink pins, and drawings that lift on hover and open big on a tap. The
 * directions differ in how the drawings themselves are laid out.
 */

export const INKED = "border-2 border-[#0f1b2d]";
export const YELLOW = "#ffca39";

/** The pin colour for the drawing at `index`, cycling the palette. */
export const tackFor = (index: number) =>
  TACK_COLORS[index % TACK_COLORS.length];

/** The page around a direction: styles, header, footer and the close-up. */
export function Page({
  children,
  className = "bg-white",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-h-dvh ${className}`}>
      <style>{PIN_CSS + MOTION_CSS + LIGHTBOX_CSS}</style>
      <Header />
      {children}
      <p className="text-muted-foreground px-4 pb-32 text-center text-xs">
        Signed in as {BOARD.viewer} ·{" "}
        <a href="#" className="underline underline-offset-4">
          Sign out
        </a>
      </p>
    </div>
  );
}

function Header() {
  return (
    <header className="bg-primary text-primary-foreground border-b-2 border-[#0f1b2d]">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-8 pb-8">
        <span
          className={`${hand.className} w-fit -rotate-2 rounded-sm px-2.5 py-0.5 text-xl leading-tight font-bold text-[#0f1b2d]`}
          style={{ backgroundColor: YELLOW }}
        >
          {BOARD.thisWeek} new this week!
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl leading-[1.02] font-black tracking-tight">
            {BOARD.name}
          </h1>
          <p className="text-sm text-white/80">
            {BOARD.artists} artists · {BOARD.drawings} drawings
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <a
            href="#"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-bold ring-1 ring-white/35 transition-colors duration-150 ease-out hover:bg-white/25 motion-reduce:transition-none"
          >
            <TrophyIcon
              weight="fill"
              className="size-5"
              style={{ color: YELLOW }}
            />
            Hall of Fame
          </a>
          <a
            href="#"
            className={`${INKED} draw-awake inline-flex h-12 items-center gap-2 rounded-xl px-5 font-extrabold text-[#0f1b2d] shadow-[4px_4px_0_#0f1b2d] transition-[translate,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#0f1b2d] active:translate-x-1 active:translate-y-1 active:shadow-none active:duration-75 motion-reduce:transition-none`}
            style={{ backgroundColor: YELLOW }}
          >
            <PencilSimpleIcon weight="bold" className="size-5" />
            Draw
          </a>
        </div>
      </div>
    </header>
  );
}

/** The way into last week's vote, pinned up, with its drawings hopping. */
export function VoteCard({ className = "" }: { className?: string }) {
  return (
    <a
      href="#"
      style={pinStyle(TACK_COLORS[0], 100)}
      className={`${INKED} pinned pin-pop vote-awake motion-safe:animate-fade-up relative flex flex-col gap-3 rounded-xl bg-white p-4 pt-5 shadow-[5px_5px_0_#004aad] transition-[translate,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_#004aad] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0_#004aad] active:duration-75 motion-reduce:transition-none ${className}`}
    >
      <span className="flex gap-1.5">
        {PEEK.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="peek size-11 rounded-md border border-[#0f1b2d]/20 bg-white object-cover"
            style={{
              transform: `rotate(${leanFor(index, 4)}deg)`,
              animationDelay: `${1.6 + index * 0.12}s`,
            }}
          />
        ))}
      </span>
      <span className="flex items-end justify-between gap-3">
        <span>
          <span className="block text-xl leading-tight font-black">
            Vote for last week&apos;s best
          </span>
          <span className="text-muted-foreground block text-sm font-semibold">
            {BOARD.votesLeft} votes left, closes {BOARD.closesOn}
          </span>
        </span>
        <span className="arrow bg-primary text-primary-foreground grid size-11 shrink-0 place-items-center rounded-full">
          <ArrowRightIcon weight="bold" className="size-5" />
        </span>
      </span>
    </a>
  );
}

type Opened = {
  tile: ProtoTile;
  index: number;
  source: HTMLElement;
  /** The drawing's tilt where it hangs, which it opens from. */
  lean: number;
};

/**
 * Which drawing is open up close. Returns a handler for the drawings and the
 * close-up itself, to render once per page.
 */
export function useCloseUp() {
  const [open, setOpen] = useState<Opened | null>(null);
  const closeUp = open && (
    <Lightbox
      tile={open.tile}
      source={open.source}
      lean={open.lean}
      tackColor={tackFor(open.index)}
      onClosed={() => setOpen(null)}
    />
  );
  return { openIndex: open?.index ?? null, setOpen, closeUp };
}

/**
 * One drawing: on paper with its name and caption, pinned at the top, a
 * little tilted. Hovered it lifts and swings; tapped it opens up close.
 * `caption: false` leaves the words off, for a direction that sets them
 * itself.
 */
export function Drawing({
  tile,
  index,
  hidden,
  onOpen,
  caption = true,
  lean = leanFor(index, 2),
  className = "",
}: {
  tile: ProtoTile;
  index: number;
  /** Taken down while it's open up close. */
  hidden: boolean;
  onOpen: (opened: Opened) => void;
  caption?: boolean;
  lean?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={`Open ${tile.caption ? `"${tile.caption}"` : "the drawing"} by ${tile.author}`}
      onClick={(event) =>
        onOpen({ tile, index, source: event.currentTarget, lean })
      }
      className={`tile-frame pinned pin-pop relative flex w-full origin-top cursor-zoom-in flex-col bg-white p-1.5 pb-2 text-left shadow-[0_2px_3px_rgb(15_27_45/0.14),0_10px_20px_rgb(0_74_173/0.14)] outline-none focus-visible:ring-3 focus-visible:ring-[#6badfa] ${className}`}
      style={
        {
          ...pinStyle(tackFor(index), 150 + index * 60),
          transform: `rotate(${lean}deg)`,
          "--hover-swing": `${lean > 0 ? -3.5 : 3.5}deg`,
          visibility: hidden ? "hidden" : undefined,
        } as React.CSSProperties
      }
    >
      <Image
        src={tile.src}
        alt={tile.caption ?? `Drawing by ${tile.author}`}
        width={512}
        height={512}
        unoptimized
        className="aspect-square w-full object-cover"
      />
      {caption ? <TileCaption tile={tile} /> : null}
    </button>
  );
}
