import {
  ArrowRightIcon,
  PencilSimpleIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { BOARD, PEEK, TILES } from "./data";
import { Pin } from "./pin";

const INKED = "border-2 border-[#0f1b2d]";
const BLUE = "#004aad";

/** A pegboard: an even grid of punched holes on a pale board. */
const PEGS = {
  backgroundColor: "#f4f8fd",
  backgroundImage:
    "radial-gradient(circle, rgb(0 74 173 / 0.16) 2.2px, transparent 2.6px)",
  backgroundSize: "26px 26px",
  backgroundPosition: "13px 13px",
} as const;

/**
 * Pegboard: the strictest palette, blue and ink with no accent at all. The
 * board is a workshop pegboard, and every drawing hangs dead straight from
 * two pins, outlined in ink. Order instead of collage: the drawings bring
 * all the colour there is.
 */
export function Pegboard() {
  return (
    <div className="min-h-dvh" style={PEGS}>
      <header
        className="text-primary-foreground border-b-2 border-[#0f1b2d]"
        style={{ backgroundColor: BLUE }}
      >
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-8 pb-8">
          <p className="w-fit rounded-full border border-white/40 px-3 py-1 text-xs font-bold tracking-wide uppercase">
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
                <TrophyIcon weight="fill" className="size-4" />
                Hall of Fame
              </a>
            </div>
            <a
              href="#"
              className={`${INKED} inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 font-extrabold text-[#0f1b2d] shadow-[4px_4px_0_#0f1b2d] transition-[transform,box-shadow] duration-100 ease-out active:translate-x-1 active:translate-y-1 active:shadow-none motion-reduce:transition-none`}
            >
              <PencilSimpleIcon weight="bold" className="size-5" />
              Draw
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-col gap-9 px-4 pt-8 pb-32">
        <a
          href="#"
          className={`${INKED} motion-safe:animate-fade-up text-primary-foreground relative flex flex-col gap-3 rounded-xl p-4 pt-5 shadow-[5px_5px_0_#0f1b2d] transition-[transform,box-shadow] duration-100 ease-out active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0_#0f1b2d] motion-reduce:transition-none`}
          style={{ backgroundColor: BLUE }}
        >
          <Pin color="#ffffff" size={14} className="-top-1.5 left-5" />
          <Pin color="#ffffff" size={14} className="-top-1.5 right-5" />
          <span className="flex gap-1.5">
            {PEEK.map((src) => (
              <Image
                key={src}
                src={src}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="size-11 rounded-md border-2 border-white bg-white object-cover"
              />
            ))}
          </span>
          <span className="flex items-end justify-between gap-3">
            <span>
              <span className="block text-xl leading-tight font-black">
                Vote for last week&apos;s best
              </span>
              <span className="block text-sm font-semibold text-white/80">
                {BOARD.votesLeft} votes left, closes {BOARD.closesOn}
              </span>
            </span>
            <ArrowRightIcon weight="bold" className="size-7 shrink-0" />
          </span>
        </a>

        <section className="flex flex-col gap-5">
          <h2 className="text-2xl font-black tracking-tight">This week</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8">
            {TILES.map((tile, index) => (
              <li
                key={tile.id}
                className="motion-safe:animate-fade-up flex min-w-0 flex-col gap-2.5"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="relative">
                  <Pin color={BLUE} size={13} className="-top-1.5 left-3" />
                  <Pin color={BLUE} size={13} className="-top-1.5 right-3" />
                  <Image
                    src={tile.src}
                    alt={tile.caption ?? `Drawing by ${tile.author}`}
                    width={512}
                    height={512}
                    unoptimized
                    className={`${INKED} aspect-square w-full rounded-md bg-white object-cover shadow-[0_8px_16px_rgb(0_74_173/0.12)]`}
                  />
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
