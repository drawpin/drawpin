import {
  ArrowRightIcon,
  PencilSimpleIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { BOARD, leanFor, PEEK, TILES } from "./data";
import { BLOCKS, DOT_GRID, hand, TAPES } from "./fonts";

const INKED = "border-2 border-[#0f1b2d]";

/**
 * Doodle Pop: Sketchbook's page with Poster's objects on it. The background
 * stays dot-grid paper and the title gets a highlighter swipe, but every
 * thing on the page (the Draw button, the vote card, each drawing) is inked
 * with a hard shadow in the palette, and the drawings keep their tape. Crafty
 * everywhere, bold on anything you can touch.
 */
export function DoodlePop() {
  return (
    <div className="min-h-dvh" style={DOT_GRID}>
      <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 pt-8 pb-32">
        <header className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col items-start gap-2">
            <h1 className="text-3xl leading-tight font-black tracking-tight">
              <span
                className="box-decoration-clone px-1"
                style={{
                  backgroundImage:
                    "linear-gradient(104deg, transparent 2%, rgb(255 202 57 / 0.9) 3%, rgb(255 202 57 / 0.9) 96%, transparent 97%)",
                  backgroundSize: "100% 55%",
                  backgroundPosition: "0 85%",
                  backgroundRepeat: "no-repeat",
                }}
              >
                {BOARD.name}
              </span>
            </h1>
            <p className="text-muted-foreground text-sm">
              {BOARD.artists} artists · {BOARD.drawings} drawings
            </p>
            <a
              href="#"
              className="text-primary inline-flex min-h-11 items-center gap-1.5 text-sm font-bold underline decoration-wavy decoration-2 underline-offset-4"
            >
              <TrophyIcon weight="bold" className="size-4" />
              Hall of Fame
            </a>
          </div>
          <a
            href="#"
            className={`${INKED} bg-primary text-primary-foreground inline-flex h-12 shrink-0 -rotate-2 items-center gap-2 rounded-xl px-5 font-extrabold shadow-[4px_4px_0_#0f1b2d] transition-[transform,box-shadow] duration-100 ease-out hover:rotate-0 active:translate-x-1 active:translate-y-1 active:shadow-none motion-reduce:transition-none`}
          >
            <PencilSimpleIcon weight="bold" className="size-5" />
            Draw
          </a>
        </header>

        <a
          href="#"
          className={`${INKED} motion-safe:animate-fade-up relative flex rotate-1 flex-col gap-3 rounded-xl bg-[#ff821b] px-4 pt-5 pb-4 text-[#0f1b2d] shadow-[5px_5px_0_#0f1b2d] transition-[transform,box-shadow] duration-100 ease-out hover:rotate-0 active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0_#0f1b2d] motion-reduce:transition-none`}
        >
          <span
            aria-hidden
            className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-3"
            style={{ backgroundColor: TAPES[1] }}
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
                className={`${INKED} size-11 rounded-md bg-white object-cover`}
                style={{ transform: `rotate(${leanFor(index, 4)}deg)` }}
              />
            ))}
          </span>
          <span className="flex items-end justify-between gap-3">
            <span>
              <span
                className={`${hand.className} block text-3xl leading-none font-bold`}
              >
                Last week&apos;s up for a vote!
              </span>
              <span className="mt-1 block text-sm font-semibold">
                {BOARD.votesLeft} votes left, closes {BOARD.closesOn}
              </span>
            </span>
            <ArrowRightIcon weight="bold" className="size-7 shrink-0" />
          </span>
        </a>

        <section className="flex flex-col gap-4">
          <h2
            className={`${hand.className} text-primary -rotate-1 text-3xl font-bold`}
          >
            This week&apos;s page
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-7">
            {TILES.map((tile, index) => (
              <li
                key={tile.id}
                className="motion-safe:animate-fade-up flex min-w-0 flex-col gap-2.5"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div
                  className="relative"
                  style={{ transform: `rotate(${leanFor(index, 1.6)}deg)` }}
                >
                  <span
                    aria-hidden
                    className="absolute -top-2.5 left-1/2 z-10 h-5 w-14"
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
                    className={`${INKED} aspect-square w-full rounded-lg bg-white object-cover`}
                    style={{
                      boxShadow: `5px 5px 0 ${BLOCKS[index % BLOCKS.length]}`,
                    }}
                  />
                </div>
                <div className="min-w-0 px-0.5">
                  <p className="truncate text-sm font-extrabold">
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
