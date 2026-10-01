import {
  ArrowRightIcon,
  PencilSimpleIcon,
  SparkleIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import { Bricolage_Grotesque } from "next/font/google";
import Image from "next/image";
import { BOARD, leanFor, PEEK, TILES } from "./data";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
});

/** A starburst sticker's outline: twelve points. */
const BURST =
  "polygon(50% 0%, 61% 15%, 79% 9%, 79% 27%, 97% 32%, 87% 47%, 97% 63%, 79% 69%, 79% 88%, 61% 82%, 50% 98%, 39% 82%, 21% 88%, 21% 69%, 3% 63%, 13% 47%, 3% 32%, 21% 27%, 21% 9%, 39% 15%)";

/**
 * Splash: the board as a party wall. Soft paint blobs in the palette behind
 * everything, a chunky display face, sticker badges, and a collage where
 * every fifth drawing gets featured big. The most colour of the four, and
 * the most playful motion: stickers pop on, tiles wiggle under a mouse.
 */
export function Splash() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-white">
      {/* Paint blobs, fixed behind the content and never in the way. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute -top-24 -right-20 size-80 rounded-full bg-[#ffca39]/45 blur-3xl" />
        <span className="absolute top-72 -left-28 size-80 rounded-full bg-[#6badfa]/40 blur-3xl" />
        <span className="absolute top-[52rem] -right-24 size-96 rounded-full bg-[#ff821b]/30 blur-3xl" />
      </div>

      <main className="relative mx-auto flex w-full max-w-lg flex-col gap-8 px-4 pt-9 pb-32">
        <header className="relative flex flex-col gap-3">
          <span
            className="motion-safe:animate-fade-up absolute -top-3 right-2 grid size-20 rotate-12 place-items-center bg-[#ff821b] text-center text-sm leading-tight font-extrabold text-[#0f1b2d]"
            style={{ clipPath: BURST }}
          >
            {BOARD.thisWeek}
            <br />
            new!
          </span>
          <h1
            className={`${display.className} max-w-[75%] text-4xl leading-[1.05] font-extrabold tracking-tight`}
          >
            {BOARD.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            {BOARD.artists} artists · {BOARD.drawings} drawings
          </p>
          <div className="flex items-center gap-3">
            <a
              href="#"
              className="bg-primary text-primary-foreground inline-flex h-12 items-center gap-2 rounded-full px-6 font-bold shadow-[0_8px_20px_rgb(0_74_173/0.3)] transition-transform duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] motion-reduce:transition-none"
            >
              <PencilSimpleIcon weight="bold" className="size-5" />
              Draw something
            </a>
            <a
              href="#"
              className="inline-flex h-12 items-center gap-1.5 rounded-full bg-white/80 px-4 text-sm font-bold shadow-[0_2px_8px_rgb(0_74_173/0.12)]"
            >
              <TrophyIcon weight="fill" className="size-4 text-[#e0a400]" />
              Hall of Fame
            </a>
          </div>
        </header>

        <a
          href="#"
          className="motion-safe:animate-fade-up group relative flex flex-col gap-3 rounded-3xl bg-[#ffca39] p-4 text-[#0f1b2d]"
        >
          <span className="flex items-center gap-2 text-sm font-extrabold">
            <SparkleIcon weight="fill" className="size-4" />
            Voting&apos;s open
          </span>
          <span className="flex">
            {PEEK.map((src, index) => (
              <Image
                key={src}
                src={src}
                alt=""
                width={52}
                height={52}
                unoptimized
                className="-ml-3 size-13 rounded-2xl border-[3px] border-white bg-white object-cover shadow-md transition-transform duration-200 ease-out group-hover:rotate-0 first:ml-0 motion-reduce:transition-none"
                style={{ transform: `rotate(${leanFor(index, 7)}deg)` }}
              />
            ))}
          </span>
          <span className="flex items-end justify-between gap-3">
            <span
              className={`${display.className} text-2xl leading-tight font-extrabold`}
            >
              Pick last week&apos;s best
            </span>
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#0f1b2d] text-white transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none">
              <ArrowRightIcon weight="bold" className="size-5" />
            </span>
          </span>
          <span className="text-sm font-semibold">
            {BOARD.votesLeft} votes left, closes {BOARD.closesOn}
          </span>
        </a>

        <section className="flex flex-col gap-4">
          <h2
            className={`${display.className} text-2xl font-extrabold tracking-tight`}
          >
            Fresh off the board
          </h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6">
            {TILES.map((tile, index) => {
              const featured = index % 5 === 0;
              return (
                <li
                  key={tile.id}
                  className={`motion-safe:animate-fade-up flex min-w-0 flex-col gap-2 ${featured ? "col-span-2" : ""}`}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div
                    className="relative transition-transform duration-200 ease-out hover:rotate-0 motion-reduce:transition-none"
                    style={{
                      transform: `rotate(${leanFor(index, featured ? 1 : 2.5)}deg)`,
                    }}
                  >
                    <Image
                      src={tile.src}
                      alt={tile.caption ?? `Drawing by ${tile.author}`}
                      width={768}
                      height={768}
                      unoptimized
                      className="aspect-square w-full rounded-3xl border-4 border-white bg-white object-cover shadow-[0_10px_30px_rgb(0_74_173/0.16)]"
                    />
                    {tile.isNew && (
                      <span
                        className="motion-safe:animate-fade-up absolute -top-3 -left-2 grid size-14 -rotate-12 place-items-center bg-[#ffca39] text-xs font-extrabold text-[#0f1b2d]"
                        style={{ clipPath: BURST, animationDelay: "300ms" }}
                      >
                        New
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 px-1">
                    <p className="truncate text-sm font-bold">{tile.author}</p>
                    {tile.caption && (
                      <p className="text-muted-foreground truncate text-sm">
                        {tile.caption}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
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
