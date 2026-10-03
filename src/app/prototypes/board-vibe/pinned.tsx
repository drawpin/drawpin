"use client";

import { TILES } from "./data";
import { hand } from "./fonts";
import { Drawing, Page, tackFor, useCloseUp, VoteCard } from "./shared";
import { pinStyle } from "./pin";

/**
 * What's behind the drawings, the one thing round ten compares. The user
 * kept round eight's layout but not its framed board (2026-10-02):
 * - `plain`: white, nothing behind them.
 * - `tint`: the palette's light blue tint, flat.
 * - `graph`: faint light blue graph paper, like a sketchbook page.
 */
export type Backdrop = "plain" | "tint" | "graph";

const BACKDROPS: Record<Backdrop, string> = {
  plain: "bg-white",
  tint: "bg-[#edf5ff]",
  graph:
    "bg-white bg-[linear-gradient(rgb(107_173_250/0.22)_1px,transparent_1px),linear-gradient(90deg,rgb(107_173_250/0.22)_1px,transparent_1px)] bg-[size:24px_24px]",
};

/**
 * Pinned (round eight's layout, without the board): the vote card, a strip
 * of yellow paper for a heading, and the week's drawings in two columns,
 * each pinned up on paper with its name and caption, swinging into place
 * as it scrolls in.
 */
export function Pinned({ backdrop }: { backdrop: Backdrop }) {
  const { openIndex, setOpen, closeUp } = useCloseUp();
  return (
    <Page className={BACKDROPS[backdrop]}>
      <main className="mx-auto flex w-full max-w-lg flex-col gap-10 px-4 pt-10 pb-12">
        <VoteCard />
        <section className="flex flex-col gap-4">
          <h2
            style={pinStyle(tackFor(0), 120)}
            className={`${hand.className} pinned pin-pop relative mt-6 w-fit -rotate-2 bg-[#ffca39] px-4 pt-1 pb-0.5 text-3xl font-bold text-[#0f1b2d] shadow-[0_2px_3px_rgb(15_27_45/0.18),0_6px_12px_rgb(15_27_45/0.14)]`}
          >
            Pinned up this week
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-12 pt-8">
            {TILES.map((tile, index) => (
              <li
                key={tile.id}
                className="board-sway min-w-0"
                style={
                  {
                    "--swing": `${index % 2 ? 7 : -7}deg`,
                  } as React.CSSProperties
                }
              >
                <Drawing
                  tile={tile}
                  index={index}
                  hidden={openIndex === index}
                  onOpen={setOpen}
                />
              </li>
            ))}
          </ul>
        </section>
      </main>
      {closeUp}
    </Page>
  );
}
