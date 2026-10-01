import {
  ArrowRightIcon,
  PencilSimpleIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import {
  BACKDROP_CSS,
  CalmBackdrop,
  DoodleBackdrop,
  GlowBackdrop,
} from "./backdrops";
import { BOARD, leanFor, PEEK, TILES } from "./data";
import { hand } from "./fonts";
import { Pin } from "./pin";

const INKED = "border-2 border-[#0f1b2d]";
const YELLOW = "#ffca39";

/**
 * What makes the page lively, the one thing round five compares:
 * - `glow`: soft blue and yellow light drifting slowly behind the board.
 * - `doodles`: a sparse, faint wallpaper of the kind of thing people draw.
 * - `alive`: a calm page, with the drawings swinging in on their pins as
 *   they scroll into view and the pins popping in on load.
 */
export type Backdrop = "glow" | "doodles" | "alive";

/**
 * Pinned: Zine with the colour cut back to blue and one accent. Zine's blue
 * header stays, and every drawing hangs in a white frame from a single
 * yellow pin. Yellow appears only where something is stuck up, pressed or
 * won: the pins, the Draw button, the "new" tag and the Hall of Fame trophy.
 */
export function Pinned({ backdrop }: { backdrop: Backdrop }) {
  const alive = backdrop === "alive";
  return (
    <div className="min-h-dvh bg-white">
      <style>{BACKDROP_CSS}</style>
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
              className={`${INKED} inline-flex h-12 items-center gap-2 rounded-xl px-5 font-extrabold text-[#0f1b2d] shadow-[4px_4px_0_#0f1b2d] transition-[transform,box-shadow] duration-100 ease-out active:translate-x-1 active:translate-y-1 active:shadow-none motion-reduce:transition-none`}
              style={{ backgroundColor: YELLOW }}
            >
              <PencilSimpleIcon weight="bold" className="size-5" />
              Draw
            </a>
          </div>
        </div>
      </header>

      <div className="relative">
        {backdrop === "glow" && <GlowBackdrop />}
        {backdrop === "doodles" && <DoodleBackdrop />}
        {backdrop === "alive" && <CalmBackdrop />}
        <main className="relative mx-auto flex w-full max-w-lg flex-col gap-9 px-4 pt-8 pb-32">
          {/* The vote, pinned up as a card. White and ink: the colour is in
            the drawings on it. */}
          <a
            href="#"
            className={`${INKED} motion-safe:animate-fade-up relative flex flex-col gap-3 rounded-xl bg-white p-4 pt-5 shadow-[5px_5px_0_#004aad] transition-[transform,box-shadow] duration-100 ease-out active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0_#004aad] motion-reduce:transition-none`}
          >
            <Pin
              color={YELLOW}
              className="-top-2.5 left-1/2 -translate-x-1/2"
            />
            <span className="flex gap-1.5">
              {PEEK.map((src, index) => (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                  className="size-11 rounded-md border border-[#0f1b2d]/20 bg-white object-cover"
                  style={{ transform: `rotate(${leanFor(index, 4)}deg)` }}
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
              <span className="bg-primary text-primary-foreground grid size-11 shrink-0 place-items-center rounded-full">
                <ArrowRightIcon weight="bold" className="size-5" />
              </span>
            </span>
          </a>

          <section className="flex flex-col gap-4">
            <h2
              className={`${hand.className} text-primary -rotate-1 text-3xl font-bold`}
            >
              Pinned up this week
            </h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-9">
              {TILES.map((tile, index) => (
                <li
                  key={tile.id}
                  // Alive: each drawing swings into place on its pin as it
                  // scrolls in, alternating sides like papers in a draught.
                  className={`flex min-w-0 flex-col gap-2 ${
                    alive ? "board-sway" : "motion-safe:animate-fade-up"
                  }`}
                  style={
                    alive
                      ? ({
                          "--swing": `${index % 2 ? 7 : -7}deg`,
                        } as React.CSSProperties)
                      : { animationDelay: `${index * 40}ms` }
                  }
                >
                  <div
                    className="relative origin-top bg-white p-1.5 shadow-[0_2px_3px_rgb(0_74_173/0.1),0_10px_20px_rgb(0_74_173/0.12)]"
                    style={{ transform: `rotate(${leanFor(index, 2)}deg)` }}
                  >
                    <Pin
                      color={YELLOW}
                      className={`-top-2.5 left-1/2 -translate-x-1/2 ${alive ? "pin-pop" : ""}`}
                      delayMs={alive ? 150 + index * 60 : undefined}
                    />
                    <Image
                      src={tile.src}
                      alt={tile.caption ?? `Drawing by ${tile.author}`}
                      width={512}
                      height={512}
                      unoptimized
                      className="aspect-square w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 px-1">
                    <p className="truncate text-sm font-bold">{tile.author}</p>
                    {tile.caption && (
                      <p
                        className={`${hand.className} text-muted-foreground truncate text-lg leading-tight`}
                      >
                        &ldquo;{tile.caption}&rdquo;
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-muted-foreground text-center text-xs">
            Signed in as {BOARD.viewer} ·{" "}
            <a href="#" className="underline underline-offset-4">
              Sign out
            </a>
          </p>
        </main>
      </div>
    </div>
  );
}
