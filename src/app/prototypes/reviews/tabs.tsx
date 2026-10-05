"use client";

import {
  BriefcaseIcon,
  ForkKnifeIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";
import { pinStyle } from "@/components/pin";
import { PAPER } from "../../b/[slug]/board-look";
import { QUOTES } from "./quotes";

const ICONS = {
  Restaurant: ForkKnifeIcon,
  Office: BriefcaseIcon,
  Friends: UsersThreeIcon,
};

/**
 * Pick a place: choose restaurant, office or friends, and that board's
 * drawing goes up with what they said popping out of it as a speech bubble.
 * Axis: context, the visitor picks the group that's most like theirs.
 */
export function Tabs() {
  const [active, setActive] = useState(0);
  const quote = QUOTES[active];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5">
      <div role="tablist" className="flex flex-wrap gap-2">
        {QUOTES.map((item, index) => {
          const Icon = ICONS[item.place];
          const on = index === active;
          return (
            <button
              key={item.place}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(index)}
              className={`border-foreground focus-visible:ring-highlight inline-flex h-12 items-center gap-2 rounded-full border-2 px-5 text-base font-bold outline-none focus-visible:ring-3 ${on ? "bg-primary text-white shadow-[3px_3px_0_var(--foreground)]" : "hover:bg-secondary bg-white"}`}
            >
              <Icon weight="bold" className="size-5" />
              {item.place}
            </button>
          );
        })}
      </div>

      <div
        key={quote.place}
        role="tabpanel"
        className="grid items-center gap-8 md:grid-cols-[14rem_1fr]"
      >
        <div
          className={`pinned pin-pop relative mx-auto w-48 -rotate-2 p-1.5 md:w-56 ${PAPER}`}
          style={pinStyle(quote.pin)}
        >
          <Image
            src={quote.drawing}
            alt={`A drawing from a ${quote.place.toLowerCase()} board`}
            width={400}
            height={400}
            unoptimized
            className="aspect-square w-full object-cover"
          />
        </div>
        {/* The bubble points back at the drawing. */}
        <figure className="review-bubble border-foreground relative rounded-2xl border-2 bg-white p-6 shadow-[5px_5px_0_var(--primary)]">
          <span
            aria-hidden
            className="border-foreground absolute top-10 -left-[11px] hidden size-5 rotate-45 border-b-2 border-l-2 bg-white md:block"
          />
          <blockquote className="text-foreground text-2xl leading-snug font-bold text-pretty">
            &ldquo;{quote.text}&rdquo;
          </blockquote>
          <figcaption className="text-muted-foreground mt-4 font-semibold">
            {quote.who}
          </figcaption>
        </figure>
      </div>
      <style>{`
        @keyframes review-bubble { from { opacity: 0; scale: 0.94; translate: -8px 0; } }
        @media (prefers-reduced-motion: no-preference) {
          .review-bubble { transform-origin: 0 40%; animation: review-bubble 320ms cubic-bezier(0.34, 1.56, 0.64, 1) 120ms both; }
        }
      `}</style>
    </div>
  );
}
