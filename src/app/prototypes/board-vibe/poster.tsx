import {
  ArrowRightIcon,
  PencilSimpleIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { BOARD, PEEK, TILES } from "./data";

/** The hard shadow each tile casts, cycling through the palette. */
const BLOCKS = ["#004aad", "#ffca39", "#ff821b", "#6badfa"];

/** Ink outline plus a hard offset shadow: the poster's one material. */
const INKED = "border-2 border-[#0f1b2d]";

/**
 * Poster: the board as a gig poster. Flat, hard-edged blocks of the palette,
 * thick ink outlines and hard offset shadows instead of soft ones. Things you
 * press sink into their shadow. Loud on purpose: the colour is the layout.
 */
export function Poster() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-8 pb-7">
          <p className="w-fit rounded-full bg-[#ffca39] px-3 py-1 text-xs font-extrabold tracking-wide text-[#0f1b2d] uppercase">
            {BOARD.thisWeek} new this week
          </p>
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
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold underline underline-offset-4"
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
            {PEEK.map((src) => (
              <Image
                key={src}
                src={src}
                alt=""
                width={48}
                height={48}
                unoptimized
                className={`${INKED} size-11 rounded-md bg-white object-cover`}
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

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-black tracking-tight">This week</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6">
            {TILES.map((tile, index) => (
              <li
                key={tile.id}
                className="motion-safe:animate-fade-up flex min-w-0 flex-col gap-2.5"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="relative">
                  <Image
                    src={tile.src}
                    alt={tile.caption ?? `Drawing by ${tile.author}`}
                    width={512}
                    height={512}
                    unoptimized
                    className={`${INKED} aspect-square w-full rounded-lg bg-white object-cover`}
                    style={{
                      boxShadow: `5px 5px 0 ${BLOCKS[index % BLOCKS.length]}`,
                    }}
                  />
                  {tile.isNew && (
                    <span
                      className={`${INKED} absolute -top-2 -right-2 rounded-full bg-[#ffca39] px-2 py-0.5 text-[11px] font-black text-[#0f1b2d] uppercase`}
                    >
                      New
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">
                    {tile.author}
                  </p>
                  {tile.caption && (
                    <p className="text-muted-foreground truncate text-sm">
                      {tile.caption}
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
