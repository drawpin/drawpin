import {
  ArrowRightIcon,
  PencilSimpleIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { BOARD, leanFor, PEEK, TILES } from "./data";
import { hand } from "./fonts";
import { Pin } from "./pin";

const INKED = "border-2 border-[#0f1b2d]";
const BLUE = "#004aad";
const ORANGE = "#ff821b";

/** The board's surface inside the frame: the tint, faintly speckled. */
const SURFACE = {
  backgroundColor: "#edf5ff",
  backgroundImage:
    "radial-gradient(circle at 20% 30%, rgb(0 74 173 / 0.05) 1px, transparent 1.5px), radial-gradient(circle at 70% 60%, rgb(0 74 173 / 0.05) 1px, transparent 1.5px)",
  backgroundSize: "9px 9px, 13px 13px",
} as const;

/** Where each drawing's pin goes, so they don't all line up. */
const PIN_SPOTS = [
  "left-1/2 -translate-x-1/2",
  "left-4",
  "right-4",
  "left-1/2 -translate-x-1/2",
  "right-6",
  "left-6",
];

/** An index card: white with faint rules and one coloured top rule. */
const INDEX_CARD = {
  backgroundColor: "#ffffff",
  backgroundImage: `linear-gradient(180deg, transparent 46px, ${ORANGE} 46px, ${ORANGE} 48px, transparent 48px), repeating-linear-gradient(180deg, transparent 0 21px, rgb(0 74 173 / 0.12) 21px 22px)`,
} as const;

/**
 * Bulletin: a classic bulletin board in a thick blue frame, with orange as
 * the only accent. The header is the top of the frame; inside, drawings are
 * pinned up at angles with orange pins, names sit on small paper slips, and
 * the vote is an index card pinned to the board.
 */
export function Bulletin() {
  return (
    <div className="min-h-dvh" style={{ backgroundColor: BLUE }}>
      <header className="text-primary-foreground mx-auto flex w-full max-w-lg flex-col gap-4 px-5 pt-8 pb-6">
        <h1 className="text-4xl leading-[1.02] font-black tracking-tight">
          {BOARD.name}
        </h1>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-white/80">
              {BOARD.thisWeek} new this week · {BOARD.artists} artists
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
            className={`${INKED} inline-flex h-12 items-center gap-2 rounded-xl px-5 font-extrabold text-[#0f1b2d] shadow-[4px_4px_0_#0f1b2d] transition-[transform,box-shadow] duration-100 ease-out active:translate-x-1 active:translate-y-1 active:shadow-none motion-reduce:transition-none`}
            style={{ backgroundColor: ORANGE }}
          >
            <PencilSimpleIcon weight="bold" className="size-5" />
            Draw
          </a>
        </div>
      </header>

      {/* The board, set into the frame: blue shows on both sides of it. */}
      <div className="mx-auto w-full max-w-lg px-2.5 pb-2.5">
        <main
          className="flex flex-col gap-9 rounded-xl px-4 pt-8 pb-32 shadow-[inset_0_2px_6px_rgb(15_27_45/0.25)]"
          style={SURFACE}
        >
          <a
            href="#"
            className="motion-safe:animate-fade-up relative block -rotate-1 rounded-sm px-4 pt-4 pb-4 text-[#0f1b2d] shadow-[0_2px_3px_rgb(15_27_45/0.12),0_10px_20px_rgb(0_74_173/0.14)] transition-transform duration-200 ease-out hover:rotate-0 motion-reduce:transition-none"
            style={INDEX_CARD}
          >
            <Pin color={ORANGE} className="-top-2 left-1/2 -translate-x-1/2" />
            <span
              className={`${hand.className} block text-2xl leading-none font-bold`}
            >
              Vote for last week&apos;s best
            </span>
            <span className="mt-4 flex gap-1.5">
              {PEEK.map((src, index) => (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                  className="size-11 border border-[#0f1b2d]/15 bg-white object-cover shadow-sm"
                  style={{ transform: `rotate(${leanFor(index, 4)}deg)` }}
                />
              ))}
            </span>
            <span className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">
                {BOARD.votesLeft} votes left, closes {BOARD.closesOn}
              </span>
              <ArrowRightIcon weight="bold" className="size-6 shrink-0" />
            </span>
          </a>

          <ul className="grid grid-cols-2 gap-x-4 gap-y-9">
            {TILES.map((tile, index) => (
              <li
                key={tile.id}
                className="motion-safe:animate-fade-up flex min-w-0 flex-col items-center gap-0"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div
                  className="relative w-full bg-white p-1.5 shadow-[0_2px_3px_rgb(15_27_45/0.12),0_10px_20px_rgb(0_74_173/0.14)]"
                  style={{ transform: `rotate(${leanFor(index, 2.4)}deg)` }}
                >
                  <Pin
                    color={ORANGE}
                    className={`-top-2 ${PIN_SPOTS[index % PIN_SPOTS.length]}`}
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
                {/* The name on a slip of paper, tucked under the drawing. */}
                <div
                  className="relative z-10 -mt-1.5 max-w-[92%] bg-white px-2 py-1 shadow-[0_2px_4px_rgb(15_27_45/0.12)]"
                  style={{ transform: `rotate(${leanFor(index + 2, 2)}deg)` }}
                >
                  <p className="truncate text-xs font-bold">{tile.author}</p>
                  {tile.caption && (
                    <p
                      className={`${hand.className} text-muted-foreground truncate text-base leading-tight`}
                    >
                      {tile.caption}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>

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
