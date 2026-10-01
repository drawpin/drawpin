import {
  ArrowRightIcon,
  PencilSimpleIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { BOARD, leanFor, PEEK, TILES } from "./data";
import { hand, TAPES } from "./fonts";

const INKED = "border-2 border-[#0f1b2d]";

/** A torn edge top and bottom, for strips of paper. */
const TORN =
  "polygon(0% 6%, 6% 0%, 13% 5%, 21% 1%, 29% 6%, 37% 0%, 46% 5%, 54% 1%, 62% 6%, 71% 0%, 79% 5%, 87% 1%, 94% 6%, 100% 2%, 100% 95%, 93% 100%, 86% 94%, 78% 99%, 70% 95%, 61% 100%, 53% 94%, 45% 99%, 36% 95%, 28% 100%, 20% 94%, 12% 99%, 5% 95%, 0% 100%)";

/** Ruled notebook paper, faint blue lines with a margin rule. */
const RULED = {
  backgroundColor: "#ffffff",
  backgroundImage:
    "linear-gradient(90deg, transparent 8px, rgb(255 130 27 / 0.35) 8px, rgb(255 130 27 / 0.35) 10px, transparent 10px),repeating-linear-gradient(180deg, transparent 0 31px, rgb(107 173 250 / 0.3) 31px 32px)",
} as const;

/** A label-maker strip: ink tape, raised white capitals. */
function LabelTag({ text, lean }: { text: string; lean: number }) {
  return (
    <span
      className="inline-block max-w-full truncate rounded-[3px] bg-[#0f1b2d] px-2 py-0.5 text-[11px] font-bold tracking-[0.08em] text-white uppercase shadow-[0_1px_0_rgb(255_255_255/0.25)_inset]"
      style={{ transform: `rotate(${lean}deg)` }}
    >
      {text}
    </span>
  );
}

/**
 * Scrapbook: mostly Sketchbook, with Poster's punch kept for a few accents.
 * Ruled notebook paper, the board's name on a torn strip of yellow paper,
 * drawings taped in, names on label-maker tape, and the vote as a sticky note
 * with an ink outline and a hard shadow. The softest of the three mixes.
 */
export function Scrapbook() {
  return (
    <div className="min-h-dvh" style={RULED}>
      <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 pt-8 pb-32">
        <header className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <h1
              className="w-fit -rotate-1 bg-[#ffca39] px-4 py-3 text-3xl leading-tight font-black tracking-tight text-[#0f1b2d]"
              style={{ clipPath: TORN }}
            >
              {BOARD.name}
            </h1>
            <a
              href="#"
              className={`${INKED} bg-primary text-primary-foreground inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-5 font-extrabold shadow-[3px_3px_0_#0f1b2d] transition-[transform,box-shadow] duration-100 ease-out active:translate-x-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transition-none`}
            >
              <PencilSimpleIcon weight="bold" className="size-5" />
              Draw
            </a>
          </div>
          <div className="flex items-center gap-3 pl-1">
            <p className="text-muted-foreground text-sm">
              {BOARD.artists} artists · {BOARD.drawings} drawings
            </p>
            <a
              href="#"
              className="text-primary inline-flex min-h-11 items-center gap-1.5 text-sm font-bold"
            >
              <TrophyIcon weight="bold" className="size-4" />
              Hall of Fame
            </a>
          </div>
        </header>

        <a
          href="#"
          className={`${INKED} motion-safe:animate-fade-up relative block -rotate-1 rounded-sm px-5 pt-6 pb-5 text-[#0f1b2d] shadow-[5px_5px_0_#004aad] transition-[transform,box-shadow] duration-100 ease-out hover:rotate-0 active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0_#004aad] motion-reduce:transition-none`}
          style={{ backgroundColor: "#ffe08a" }}
        >
          <span
            aria-hidden
            className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-2"
            style={{ backgroundColor: TAPES[2] }}
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
                className="-ml-2 size-12 rounded-md border-2 border-white bg-white object-cover shadow-sm first:ml-0"
                style={{ transform: `rotate(${leanFor(index, 5)}deg)` }}
              />
            ))}
          </span>
          <span className="mt-3 flex items-end justify-between gap-3">
            <span>
              <span
                className={`${hand.className} block text-3xl leading-none font-bold`}
              >
                Pick last week&apos;s best!
              </span>
              <span className="mt-1 block text-sm font-semibold">
                {BOARD.votesLeft} votes left, closes {BOARD.closesOn}
              </span>
            </span>
            <ArrowRightIcon weight="bold" className="size-6 shrink-0" />
          </span>
        </a>

        <section className="flex flex-col gap-4">
          <h2
            className={`${hand.className} text-primary pl-1 text-3xl font-bold`}
          >
            This week, so far
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8">
            {TILES.map((tile, index) => (
              <li
                key={tile.id}
                className="motion-safe:animate-fade-up flex min-w-0 flex-col gap-2"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div
                  className="relative border border-[#0f1b2d]/15 bg-white p-1.5 shadow-[0_6px_14px_rgb(0_74_173/0.12)]"
                  style={{ transform: `rotate(${leanFor(index, 2.2)}deg)` }}
                >
                  <span
                    aria-hidden
                    className="absolute -top-2.5 -left-3 z-10 h-5 w-14 -rotate-[30deg]"
                    style={{ backgroundColor: TAPES[index % TAPES.length] }}
                  />
                  <span
                    aria-hidden
                    className="absolute -right-3 -bottom-2.5 z-10 h-5 w-14 -rotate-[30deg]"
                    style={{
                      backgroundColor: TAPES[(index + 1) % TAPES.length],
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
                <div className="flex min-w-0 flex-col items-start gap-1 pt-1">
                  <LabelTag text={tile.author} lean={leanFor(index + 2, 1.5)} />
                  {tile.caption && (
                    <p
                      className={`${hand.className} text-muted-foreground max-w-full truncate text-lg leading-tight`}
                    >
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
