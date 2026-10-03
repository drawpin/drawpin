"use client";

import { type ProtoTile, TILES } from "./data";
import { hand } from "./fonts";
import { Drawing, Page, useCloseUp, VoteCard } from "./shared";

/**
 * Shelves: the week in rows you swipe sideways, newest first, with the next
 * drawing peeking in at the edge so it's clear there's more. Today's row is
 * bigger; the rest of the week is smaller and quicker to flick through.
 * Axis: interaction, browsing across instead of scrolling down.
 */
export function Shelves() {
  const { openIndex, setOpen, closeUp } = useCloseUp();
  const rows: {
    title: string;
    note: string;
    start: number;
    tiles: ProtoTile[];
    big: boolean;
  }[] = [
    {
      title: "Today",
      note: "fresh off the pen",
      start: 0,
      tiles: TILES.slice(0, 3),
      big: true,
    },
    {
      title: "Earlier this week",
      note: "swipe for more",
      start: 3,
      tiles: TILES.slice(3),
      big: false,
    },
  ];
  return (
    <Page className="bg-[#edf5ff]">
      <main className="mx-auto flex w-full max-w-lg flex-col gap-10 overflow-x-clip pt-10 pb-12">
        <div className="px-4">
          <VoteCard />
        </div>
        {rows.map((row) => {
          return (
            <section key={row.title} className="flex flex-col">
              <div className="flex items-baseline justify-between gap-3 px-4">
                <h2 className="text-2xl font-black tracking-tight text-[#0f1b2d]">
                  {row.title}
                  <span className="text-primary ml-2 text-base font-bold">
                    {row.tiles.length}
                  </span>
                </h2>
                <p
                  className={`${hand.className} text-primary -rotate-2 text-xl`}
                >
                  {row.note} →
                </p>
              </div>
              {/* Snaps a drawing to the left edge; the gutter matches the
                  page's, so the first one lines up with the heading. */}
              <ul className="flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-5 overflow-x-auto px-4 pt-9 pb-8 [&::-webkit-scrollbar]:hidden">
                {row.tiles.map((tile, i) => {
                  const index = row.start + i;
                  return (
                    <li
                      key={tile.id}
                      className={`shrink-0 snap-start ${row.big ? "w-[68%]" : "w-[44%]"}`}
                    >
                      <Drawing
                        tile={tile}
                        index={index}
                        hidden={openIndex === index}
                        onOpen={setOpen}
                      />
                    </li>
                  );
                })}
                {/* Lets the last drawing snap to the left edge too. */}
                <li aria-hidden className="w-px shrink-0" />
              </ul>
            </section>
          );
        })}
      </main>
      {closeUp}
    </Page>
  );
}
