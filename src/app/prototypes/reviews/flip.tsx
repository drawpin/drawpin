"use client";

import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";
import { pinStyle } from "@/components/pin";
import { hand } from "@/lib/fonts";
import { QUOTES } from "./quotes";

/**
 * Flip: three polaroids from three boards, each with what the people behind
 * it said written on the back. Tap one to turn it over. Axis: discovery,
 * the quotes are found rather than shown.
 */
export function Flip() {
  const [flipped, setFlipped] = useState<ReadonlySet<number>>(new Set());
  const toggle = (index: number) =>
    setFlipped((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5">
      <ul className="grid gap-10 pt-6 sm:grid-cols-3 sm:gap-6">
        {QUOTES.map((quote, index) => {
          const on = flipped.has(index);
          return (
            <li
              key={quote.place}
              className="mx-auto w-full max-w-64 [perspective:1000px] sm:max-w-none"
            >
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-pressed={on}
                aria-label={`${quote.place}: ${on ? "show the drawing" : "read what they said"}`}
                className="pinned relative block aspect-[4/5] w-full cursor-pointer outline-none [transform-style:preserve-3d] focus-visible:ring-3 focus-visible:ring-[var(--highlight)]"
                style={pinStyle(quote.pin)}
              >
                <span
                  className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] [transform-style:preserve-3d] motion-reduce:transition-none"
                  style={{ transform: on ? "rotateY(180deg)" : "none" }}
                >
                  {/* Front: the drawing. */}
                  <span className="absolute inset-0 flex flex-col gap-2 bg-white p-2 pb-3 shadow-[0_2px_3px_rgb(15_27_45/0.14),0_10px_20px_rgb(0_74_173/0.14)] [backface-visibility:hidden]">
                    <Image
                      src={quote.drawing}
                      alt=""
                      width={400}
                      height={400}
                      unoptimized
                      className="aspect-square w-full object-cover"
                    />
                    <span className="flex items-center justify-between px-1">
                      <span className="font-black">{quote.place}</span>
                      <ArrowsClockwiseIcon
                        weight="bold"
                        className="text-primary size-5"
                      />
                    </span>
                  </span>
                  {/* Back: what they said, handwritten on the back. */}
                  <span className="bg-secondary absolute inset-0 flex [transform:rotateY(180deg)] flex-col justify-between gap-3 p-5 text-left shadow-[0_2px_3px_rgb(15_27_45/0.14),0_10px_20px_rgb(0_74_173/0.14)] [backface-visibility:hidden]">
                    <span
                      className={`${hand.className} text-foreground text-2xl leading-tight font-bold`}
                    >
                      &ldquo;{quote.text}&rdquo;
                    </span>
                    <span className="text-muted-foreground text-sm font-semibold">
                      {quote.who}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground text-center text-lg">
        Tap a drawing to read what they said.
      </p>
    </div>
  );
}
