"use client";

import {
  ArrowRightIcon,
  PencilSimpleIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";
import { Board, type Surface, tacksFor } from "./boards";
import { BOARD, leanFor, PEEK, type ProtoTile, TILES } from "./data";
import { hand } from "./fonts";
import { Lightbox, LIGHTBOX_CSS } from "./lightbox";
import { MOTION_CSS } from "./motion";
import { TileCaption } from "./caption";
import { PIN_CSS, pinStyle } from "./pin";

const INKED = "border-2 border-[#0f1b2d]";
const YELLOW = "#ffca39";

/**
 * Pinned, alive: Zine's blue header, and every drawing hung in a white frame
 * from a thumb tack. As the board scrolls, each drawing swings into place on
 * its tack, and the tacks pop in when the page loads (round five's winner).
 * The tacks cycle through the palette; elsewhere yellow still means pressed
 * or won: the Draw button, the "new" tag and the Hall of Fame trophy.
 *
 * Awake (2026-10-01): the Draw button and the vote card move every few
 * seconds, a drawing lifts on its tack when hovered, and a tap takes it down
 * to see it big. See `motion.ts` and `lightbox.tsx`.
 *
 * On a board (round eight): the vote card, a paper heading and the drawings
 * are all pinned to a framed board (`boards.tsx`), and each drawing's name
 * and caption are written on its paper.
 */
export function Pinned({ surface }: { surface: Surface }) {
  const tacks = tacksFor(surface);
  const [open, setOpen] = useState<{
    tile: ProtoTile;
    index: number;
    source: HTMLElement;
  } | null>(null);
  return (
    <div className="min-h-dvh bg-white">
      <style>{PIN_CSS + MOTION_CSS + LIGHTBOX_CSS}</style>
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
            {/* A button, not a link in the small print: winners are what
                the board is for. The trophy takes the yellow of winning. */}
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

      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-3 pt-6 pb-32">
        <Board
          surface={surface}
          className="flex flex-col gap-10 px-4 pt-12 pb-10"
        >
          {/* The vote, pinned up as a card. White and ink: the colour is in
            the drawings on it. */}
          <a
            href="#"
            className={`${INKED} pinned pin-pop vote-awake motion-safe:animate-fade-up relative flex flex-col gap-3 rounded-xl bg-white p-4 pt-5 shadow-[5px_5px_0_var(--card-shadow)] transition-[translate,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_var(--card-shadow)] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0_var(--card-shadow)] active:duration-75 motion-reduce:transition-none`}
            style={
              {
                ...pinStyle(tacks[0], 100),
                // The blue shadow would vanish into the navy board.
                "--card-shadow": surface === "navy" ? "#0f1b2d" : "#004aad",
              } as React.CSSProperties
            }
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
                    // They hop one after another, like being shuffled.
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

          <section className="flex flex-col gap-4">
            {/* The heading is a strip of paper pinned up too. */}
            <h2
              style={pinStyle(tacks[0], 120)}
              className={`${hand.className} pinned pin-pop relative mt-6 w-fit -rotate-2 bg-[#ffca39] px-4 pt-1 pb-0.5 text-3xl font-bold text-[#0f1b2d] shadow-[0_2px_3px_rgb(15_27_45/0.18),0_6px_12px_rgb(15_27_45/0.14)]`}
            >
              Pinned up this week
            </h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-12 pt-8">
              {TILES.map((tile, index) => (
                <li
                  key={tile.id}
                  // Each drawing swings into place on its tack as it scrolls
                  // in, alternating sides like papers in a draught.
                  className="board-sway min-w-0"
                  style={
                    {
                      "--swing": `${index % 2 ? 7 : -7}deg`,
                    } as React.CSSProperties
                  }
                >
                  <button
                    type="button"
                    aria-label={`Open ${tile.caption ? `"${tile.caption}"` : "the drawing"} by ${tile.author}`}
                    onClick={(event) =>
                      setOpen({ tile, index, source: event.currentTarget })
                    }
                    className="tile-frame pinned pin-pop relative flex w-full origin-top cursor-zoom-in flex-col bg-white p-1.5 pb-2 text-left shadow-[0_2px_3px_rgb(15_27_45/0.18),0_10px_20px_rgb(15_27_45/0.16)] outline-none focus-visible:ring-3 focus-visible:ring-[#ffca39]"
                    style={
                      {
                        ...pinStyle(
                          tacks[index % tacks.length],
                          150 + index * 60,
                        ),
                        transform: `rotate(${leanFor(index, 2)}deg)`,
                        // Hovered, it swings away from its lean.
                        "--hover-swing": `${leanFor(index, 2) > 0 ? -3.5 : 3.5}deg`,
                        // Taken down while it's open big.
                        visibility:
                          open?.index === index ? "hidden" : undefined,
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
                    <TileCaption tile={tile} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </Board>

        <p className="text-muted-foreground text-center text-xs">
          Signed in as {BOARD.viewer} ·{" "}
          <a href="#" className="underline underline-offset-4">
            Sign out
          </a>
        </p>
      </main>
      {open && (
        <Lightbox
          tile={open.tile}
          source={open.source}
          lean={leanFor(open.index, 2)}
          tackColor={tacks[open.index % tacks.length]}
          onClosed={() => setOpen(null)}
        />
      )}
    </div>
  );
}
