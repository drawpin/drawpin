import {
  ArrowRightIcon,
  PencilSimpleIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { BOARD, leanFor, PEEK, TILES } from "./data";
import { DOT_GRID, hand, TAPES } from "./fonts";

const INKED = "border-2 border-[#0f1b2d]";

/**
 * Zine: Poster's bold frame around Sketchbook's content. The header and the
 * vote block are flat colour with ink outlines and hard shadows, like a zine
 * cover; below them the page turns into a sketchbook, with the drawings taped
 * on and captions written by hand. Loud at the top, crafty where the drawings
 * are.
 */
export function Zine() {
  return (
    <div className="min-h-dvh" style={DOT_GRID}>
      <header className="bg-primary text-primary-foreground relative border-b-2 border-[#0f1b2d]">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-8 pb-8">
          <span
            className={`${hand.className} w-fit -rotate-2 rounded-sm bg-[#ffca39] px-2.5 py-0.5 text-xl leading-tight font-bold text-[#0f1b2d]`}
          >
            {BOARD.thisWeek} new this week!
          </span>
          <h1 className="text-4xl leading-[1.02] font-black tracking-tight">
            {BOARD.name}
          </h1>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-white/80">
                {BOARD.artists} artists · {BOARD.drawings} drawings
              </p>
              <a
                href="#"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold underline decoration-[#ffca39] decoration-wavy decoration-2 underline-offset-4"
              >
                <TrophyIcon weight="fill" className="size-4 text-[#ffca39]" />
                Hall of Fame
              </a>
            </div>
            <a
              href="#"
              className={`${INKED} inline-flex h-12 items-center gap-2 rounded-xl bg-[#ffca39] px-5 font-extrabold text-[#0f1b2d] shadow-[4px_4px_0_#0f1b2d] transition-[transform,box-shadow] duration-100 ease-out active:translate-x-1 active:translate-y-1 active:shadow-none motion-reduce:transition-none`}
            >
              <PencilSimpleIcon weight="bold" className="size-5" />
              Draw
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 pt-7 pb-32">
        <a
          href="#"
          className={`${INKED} motion-safe:animate-fade-up flex flex-col gap-3 rounded-xl bg-[#ff821b] p-4 text-[#0f1b2d] shadow-[5px_5px_0_#0f1b2d] transition-[transform,box-shadow] duration-100 ease-out active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0_#0f1b2d] motion-reduce:transition-none`}
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
                className={`${INKED} size-11 rounded-md bg-white object-cover`}
                style={{ transform: `rotate(${leanFor(index, 4)}deg)` }}
              />
            ))}
          </span>
          <span className="flex items-end justify-between gap-3">
            <span>
              <span className="block text-xl leading-tight font-black">
                Vote for last week&apos;s best
              </span>
              <span className="block text-sm font-semibold">
                {BOARD.votesLeft} votes left, closes {BOARD.closesOn}
              </span>
            </span>
            <ArrowRightIcon weight="bold" className="size-7 shrink-0" />
          </span>
        </a>

        <section className="flex flex-col gap-3">
          <h2
            className={`${hand.className} text-primary -rotate-1 text-3xl font-bold`}
          >
            This week&apos;s page
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8">
            {TILES.map((tile, index) => (
              <li
                key={tile.id}
                className="motion-safe:animate-fade-up flex min-w-0 flex-col gap-2"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div
                  className="relative bg-white p-1.5 shadow-[0_6px_14px_rgb(0_74_173/0.12)]"
                  style={{ transform: `rotate(${leanFor(index, 2)}deg)` }}
                >
                  <span
                    aria-hidden
                    className="absolute -top-2.5 left-1/2 z-10 h-5 w-16"
                    style={{
                      backgroundColor: TAPES[index % TAPES.length],
                      transform: `translateX(-50%) rotate(${leanFor(index + 3, 6)}deg)`,
                    }}
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
                  <p className="truncate text-sm font-semibold">
                    {tile.author}
                  </p>
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
  );
}
