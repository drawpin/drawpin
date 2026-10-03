"use client";

import { TILES } from "./data";
import { hand } from "./fonts";
import { Drawing, Page, useCloseUp, VoteCard } from "./shared";

/** The string's ends sit 4px down; `sag` is how far its middle drops. */
const END_Y = 4;

/** Where a quadratic string with control point `sag` is, `t` along it. */
const stringY = (t: number, sag: number) =>
  (1 - t) ** 2 * END_Y + 2 * (1 - t) * t * sag + t ** 2 * END_Y;

/**
 * Washing line: the drawings hang in pairs from strings sagging across the
 * page, each pinned on where its string passes, and swing into place as
 * they scroll in. No surface behind them; the page stays white and open.
 * Axis: personality, a line you hang things on rather than a grid.
 */
export function WashingLine() {
  const { openIndex, setOpen, closeUp } = useCloseUp();
  const rows = Array.from({ length: Math.ceil(TILES.length / 2) }, (_, row) =>
    TILES.slice(row * 2, row * 2 + 2),
  );
  return (
    <Page>
      <main className="mx-auto flex w-full max-w-lg flex-col gap-10 overflow-x-clip px-4 pt-10 pb-12">
        <VoteCard />
        <h2
          className={`${hand.className} text-primary -mb-2 text-center text-3xl font-bold`}
        >
          Hung up this week
        </h2>
        {rows.map((pair, row) => {
          // Alternate a slack line and a tighter one, so rows don't repeat.
          const sag = row % 2 ? 40 : 60;
          // The pins go in where the string passes a quarter of the way
          // along and three quarters, over each column's middle.
          const pinAt = stringY(0.25, sag);
          return (
            <div key={row} className="relative">
              <svg
                aria-hidden
                viewBox={`0 0 100 ${sag}`}
                preserveAspectRatio="none"
                className="absolute -inset-x-6 top-0 w-[calc(100%+3rem)]"
                style={{ height: sag }}
              >
                <path
                  d={`M0 ${END_Y} Q50 ${sag} 100 ${END_Y}`}
                  fill="none"
                  stroke="#0f1b2d"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <ul
                className="grid grid-cols-2 gap-x-12 px-5"
                // The pin's needle goes 5px into the paper's top edge.
                style={{ paddingTop: pinAt - 5 }}
              >
                {pair.map((tile, column) => {
                  const index = row * 2 + column;
                  return (
                    <li
                      key={tile.id}
                      className="board-sway min-w-0"
                      style={
                        {
                          "--swing": `${column ? 8 : -8}deg`,
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
                  );
                })}
              </ul>
            </div>
          );
        })}
      </main>
      {closeUp}
    </Page>
  );
}
