"use client";

import Image from "next/image";
import { useState } from "react";
import { pinStyle } from "@/components/pin";
import { hand } from "@/lib/fonts";
import { PAPER } from "../b/[slug]/board-look";
import { QUOTES } from "./quotes";

/** How each card sits in the pile, top first. */
const PILE = [
  "rotate-[-2deg] translate-x-0 translate-y-0",
  "rotate-[3deg] translate-x-3 translate-y-2",
  "rotate-[-5deg] -translate-x-3 translate-y-3",
];

/**
 * What people say, as notes pinned in a pile (chosen from prototypes on
 * 2026-10-05, "Shuffle"): one from a restaurant, an office and a friend
 * group, no star ratings. Tapping the top note sends it to the back, like
 * flicking through a stack, and the next one comes up.
 */
export function ReviewStack() {
  const [order, setOrder] = useState([0, 1, 2]);
  const next = () => setOrder(([first, ...rest]) => [...rest, first]);

  return (
    <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 md:grid-cols-[1.3fr_1fr]">
      <ul className="relative mx-auto h-[25rem] w-full max-w-lg md:h-[28rem]">
        {QUOTES.map((quote, index) => {
          const depth = order.indexOf(index);
          return (
            <li
              key={quote.place}
              className={`absolute inset-x-0 top-6 transition-[translate,rotate,scale] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${PILE[depth]}`}
              style={{ zIndex: 3 - depth }}
            >
              <button
                type="button"
                onClick={next}
                disabled={depth !== 0}
                aria-label={depth === 0 ? "Next quote" : undefined}
                className={`${depth === 0 ? "pinned" : ""} relative flex w-full flex-col gap-5 rounded-sm p-7 text-left md:p-9 ${PAPER} ${depth === 0 ? "cursor-pointer" : ""}`}
                style={pinStyle(quote.pin)}
              >
                <span
                  className={`${hand.className} bg-winner w-fit -rotate-2 rounded-sm px-2 text-xl font-bold`}
                >
                  {quote.place}
                </span>
                <span className="text-foreground text-xl leading-snug font-bold text-pretty md:text-2xl">
                  &ldquo;{quote.text}&rdquo;
                </span>
                <span className="flex items-center gap-3">
                  <Image
                    src={quote.drawing}
                    alt=""
                    width={64}
                    height={64}
                    unoptimized
                    className="border-foreground/15 size-14 rounded-md border object-cover"
                  />
                  <span className="text-muted-foreground text-base font-semibold">
                    {quote.who}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground text-lg">
          Tap the note for the next one.
        </p>
        <div className="flex gap-2" aria-hidden>
          {QUOTES.map((quote, index) => (
            <span
              key={quote.place}
              className={`h-2 rounded-full transition-[width,background-color] duration-300 ${order[0] === index ? "bg-primary w-8" : "bg-foreground/15 w-2"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
