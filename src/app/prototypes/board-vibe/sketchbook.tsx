import {
  ArrowRightIcon,
  PencilSimpleIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import { Caveat } from "next/font/google";
import Image from "next/image";
import { BOARD, leanFor, PEEK, TILES } from "./data";

const hand = Caveat({ subsets: ["latin"], weight: ["600", "700"] });

/** Washi tape in the brand's light colours, see-through like the real thing. */
const TAPES = [
  "rgb(255 202 57 / 0.7)",
  "rgb(107 173 250 / 0.6)",
  "rgb(255 130 27 / 0.55)",
];

/**
 * Sketchbook: the board as a page in a sketchbook. Blue dot-grid paper,
 * drawings taped in with washi tape, a highlighter swipe on the title, and
 * notes in a hand. The palette shows up as the stationery: tape, highlighter,
 * a sticky note.
 */
export function Sketchbook() {
  return (
    <div
      className="min-h-dvh"
      style={{
        backgroundColor: "#ffffff",
        backgroundImage:
          "radial-gradient(circle, rgb(107 173 250 / 0.35) 1.2px, transparent 1.3px)",
        backgroundSize: "22px 22px",
      }}
    >
      <main className="mx-auto flex w-full max-w-lg flex-col gap-7 px-4 pt-8 pb-32">
        <header className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col items-start gap-2">
            <h1 className="text-3xl leading-tight font-extrabold tracking-tight">
              <span
                className="box-decoration-clone px-1"
                style={{
                  backgroundImage:
                    "linear-gradient(104deg, transparent 2%, rgb(255 202 57 / 0.85) 3%, rgb(255 202 57 / 0.85) 96%, transparent 97%)",
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
              className="text-primary inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline decoration-wavy decoration-2 underline-offset-4"
            >
              <TrophyIcon weight="bold" className="size-4" />
              Hall of Fame
            </a>
          </div>
          <a
            href="#"
            className="bg-primary text-primary-foreground inline-flex h-12 -rotate-2 items-center gap-2 rounded-full px-5 font-bold shadow-[0_3px_0_#00347a] transition-transform duration-150 ease-out hover:rotate-0 active:translate-y-0.5 active:shadow-none motion-reduce:transition-none"
          >
            <PencilSimpleIcon weight="bold" className="size-5" />
            Draw
          </a>
        </header>

        {/* The vote prompt as a sticky note, stuck on at an angle. */}
        <a
          href="#"
          className="motion-safe:animate-fade-up relative block rotate-1 rounded-sm px-5 pt-6 pb-5 shadow-[0_8px_18px_rgb(0_74_173/0.14)] transition-transform duration-200 ease-out hover:rotate-0 motion-reduce:transition-none"
          style={{ backgroundColor: "#ffe08a" }}
        >
          <span
            aria-hidden
            className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-3"
            style={{ backgroundColor: TAPES[1] }}
          />
          <span className="flex">
            {PEEK.map((src, index) => (
              <Image
                key={src}
                src={src}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="-ml-2 size-12 rounded-md border-2 border-white bg-white object-cover first:ml-0"
                style={{ transform: `rotate(${leanFor(index, 5)}deg)` }}
              />
            ))}
            <span className="-ml-2 grid size-12 place-items-center rounded-md border-2 border-white bg-white text-sm font-bold">
              +{BOARD.peekTotal - PEEK.length}
            </span>
          </span>
          <span className="mt-3 flex items-end justify-between gap-3">
            <span>
              <span
                className={`${hand.className} block text-2xl leading-none font-bold`}
              >
                Last week&apos;s up for a vote!
              </span>
              <span className="mt-1 block text-sm">
                {BOARD.votesLeft} votes left, closes {BOARD.closesOn}
              </span>
            </span>
            <ArrowRightIcon weight="bold" className="size-6 shrink-0" />
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
                    className="absolute -top-2.5 left-1/2 z-10 h-5 w-16 -translate-x-1/2"
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
