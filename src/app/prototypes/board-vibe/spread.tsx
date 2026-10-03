"use client";

import { TILES } from "./data";
import { hand } from "./fonts";
import { Drawing, Page, useCloseUp, VoteCard } from "./shared";

/**
 * Spread: the week laid out like a magazine feature. One drawing at a time,
 * big, stepping left and right down the page, each with a giant outlined
 * number behind it, the artist's name set large and the caption pulled out
 * as a handwritten quote. Axis: layout, an editorial single column instead
 * of a grid.
 */
export function Spread() {
  const { openIndex, setOpen, closeUp } = useCloseUp();
  return (
    <Page>
      <main className="mx-auto flex w-full max-w-lg flex-col overflow-x-clip px-4 pt-10 pb-16">
        <VoteCard />

        <div className="mt-16 mb-12 flex items-end justify-between gap-4">
          <h2 className="text-primary text-6xl leading-[0.9] font-black tracking-tight">
            This
            <br />
            week
          </h2>
          <p
            className={`${hand.className} max-w-[9rem] -rotate-3 pb-1 text-right text-2xl leading-tight text-[#525252]`}
          >
            {TILES.length} drawings, newest first
          </p>
        </div>

        <ol className="flex flex-col gap-20">
          {TILES.map((tile, index) => {
            const right = index % 2 === 1;
            const [name, tag] = tile.author.split("#");
            return (
              <li key={tile.id} className="relative">
                {/* The number, outlined in the light blue, tucked behind
                    the drawing on the side it isn't. */}
                <span
                  aria-hidden
                  className={`pointer-events-none absolute -top-12 text-[9rem] leading-none font-black tracking-tighter text-transparent [-webkit-text-stroke:2px_#6badfa] ${right ? "-left-1" : "-right-1"}`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div
                  className={`board-sway relative w-[78%] ${right ? "ml-auto" : ""}`}
                  style={
                    {
                      "--swing": `${right ? 6 : -6}deg`,
                    } as React.CSSProperties
                  }
                >
                  <Drawing
                    tile={tile}
                    index={index}
                    lean={right ? 1.2 : -1.2}
                    hidden={openIndex === index}
                    onOpen={setOpen}
                    caption={false}
                  />
                </div>
                <div
                  className={`mt-5 flex flex-col gap-1 ${right ? "items-end text-right" : ""}`}
                >
                  <p className="text-2xl leading-tight font-black tracking-tight text-[#0f1b2d]">
                    {name}
                    <span className="font-semibold text-[#525252]">#{tag}</span>
                  </p>
                  {tile.caption && (
                    <p
                      className={`${hand.className} text-primary text-3xl leading-tight`}
                    >
                      &ldquo;{tile.caption}&rdquo;
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </main>
      {closeUp}
    </Page>
  );
}
