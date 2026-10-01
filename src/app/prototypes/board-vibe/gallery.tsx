import { PencilSimpleIcon, TrophyIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { BOARD, leanFor, PEEK, TILES } from "./data";

/** Push-pin heads in the palette, lit from the top left. */
const PINS = ["#ff821b", "#ffca39", "#004aad", "#6badfa"];

function Pin({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="absolute -top-2 left-1/2 z-10 size-4 -translate-x-1/2 rounded-full shadow-[0_2px_3px_rgb(15_27_45/0.35)]"
      style={{
        background: `radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.75), ${color} 45%)`,
      }}
    />
  );
}

/**
 * Gallery: the board as an exhibition. A soft blue wall, every drawing in a
 * white mat hung by a coloured pin, and a museum label underneath. The
 * calmest of the four: the colour is in the wall and the pins, and the
 * drawings are treated as the art.
 */
export function Gallery() {
  return (
    <div
      className="min-h-dvh"
      style={{
        background:
          "linear-gradient(180deg, #e3efff 0%, #edf5ff 40%, #edf5ff 100%)",
      }}
    >
      <main className="mx-auto flex w-full max-w-lg flex-col gap-10 px-5 pt-10 pb-32">
        <header className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <span className="bg-primary h-px w-8" />
            <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
              Now showing
            </p>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl leading-tight font-bold tracking-tight">
                {BOARD.name}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {BOARD.drawings} works by {BOARD.artists} artists
              </p>
            </div>
            <a
              href="#"
              className="bg-primary text-primary-foreground inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 font-semibold shadow-[0_6px_16px_rgb(0_74_173/0.25)] transition-transform duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.97] motion-reduce:transition-none"
            >
              <PencilSimpleIcon weight="bold" className="size-5" />
              Draw
            </a>
          </div>
        </header>

        {/* Last week's show, hung as a row, with the way in to vote. */}
        <a
          href="#"
          className="motion-safe:animate-fade-up group flex flex-col gap-4 rounded-2xl bg-white/70 p-4 shadow-[0_1px_2px_rgb(0_74_173/0.06),0_8px_24px_rgb(0_74_173/0.08)] backdrop-blur-sm"
        >
          <span className="flex justify-between gap-2 pt-2">
            {PEEK.map((src, index) => (
              <span key={src} className="relative">
                <Pin color={PINS[index % PINS.length]} />
                <Image
                  src={src}
                  alt=""
                  width={56}
                  height={56}
                  unoptimized
                  className="size-14 bg-white object-cover p-1 shadow-[0_4px_10px_rgb(0_74_173/0.15)] transition-transform duration-200 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none"
                />
              </span>
            ))}
          </span>
          <span className="flex items-center justify-between gap-3">
            <span>
              <span className="block font-semibold">
                Last week&apos;s show is up for a vote
              </span>
              <span className="text-muted-foreground block text-sm">
                {BOARD.votesLeft} votes left, closes {BOARD.closesOn}
              </span>
            </span>
            <span className="text-primary text-sm font-semibold">Vote</span>
          </span>
        </a>

        <section className="flex flex-col gap-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold">This week</h2>
            <a
              href="#"
              className="text-primary inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold"
            >
              <TrophyIcon weight="bold" className="size-4" />
              Hall of Fame
            </a>
          </div>
          <ul className="grid grid-cols-2 gap-x-5 gap-y-10">
            {TILES.map((tile, index) => (
              <li
                key={tile.id}
                className="motion-safe:animate-fade-up flex min-w-0 flex-col gap-3"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className="relative bg-white p-2.5 shadow-[0_2px_4px_rgb(0_74_173/0.06),0_12px_24px_rgb(0_74_173/0.1)] transition-transform duration-200 ease-out hover:-translate-y-1 motion-reduce:transition-none"
                  style={{ transform: `rotate(${leanFor(index, 0.8)}deg)` }}
                >
                  <Pin color={PINS[index % PINS.length]} />
                  <Image
                    src={tile.src}
                    alt={tile.caption ?? `Drawing by ${tile.author}`}
                    width={512}
                    height={512}
                    unoptimized
                    className="aspect-square w-full object-cover"
                  />
                </div>
                {/* The museum label. */}
                <div className="min-w-0 border-l-2 border-[#6badfa] pl-2.5">
                  <p className="truncate text-sm font-semibold">
                    {tile.caption ?? "Untitled"}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {tile.author}
                  </p>
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
