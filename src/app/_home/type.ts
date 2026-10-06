import { hand } from "@/lib/fonts";

/**
 * The home page's sizes, so every section speaks at the same few levels
 * (UI pass, 2026-10-05, after "too many size differences"):
 *
 * - the poster's headline, once, in the hero;
 * - SECTION_TITLE for each section's heading;
 * - CARD_TITLE for a heading inside a card;
 * - LEAD for the sentence under a heading;
 * - NOTE for the small handwritten note above a heading.
 *
 * Buttons are 48px tall throughout: the inked yellow one for the main action
 * and OUTLINE_BUTTON for the rest.
 */
export const SECTION_TITLE =
  "text-4xl leading-[1.05] font-black tracking-tight text-balance sm:text-5xl";

export const CARD_TITLE = "text-2xl leading-tight font-black tracking-tight";

export const LEAD = "text-muted-foreground max-w-md text-lg text-pretty";

export const NOTE = `${hand.className} bg-winner text-foreground w-fit -rotate-2 rounded-sm px-2.5 py-0.5 text-xl leading-tight font-bold`;

export const OUTLINE_BUTTON =
  "border-foreground hover:bg-secondary focus-visible:ring-highlight inline-flex h-12 items-center gap-2 rounded-xl border-2 bg-white px-4 text-base font-bold outline-none focus-visible:ring-3";
