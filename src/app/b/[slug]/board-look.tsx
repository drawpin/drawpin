import type { ReactNode } from "react";
import { hand } from "@/lib/fonts";

/**
 * The pieces the board's look is made of (UI pass, 2026-10-02), shared by
 * the board and the vote page so they stay one place.
 */

/** A drawing's paper: white, with a soft blue-tinted shadow under it. */
export const PAPER =
  "bg-white shadow-[0_2px_3px_rgb(15_27_45/0.14),0_10px_20px_rgb(0_74_173/0.14)]";

/** A strip of yellow paper, for headings and notes. */
export const YELLOW_STRIP = `${hand.className} bg-winner text-foreground w-fit -rotate-2 px-4 pt-1 pb-0.5 font-bold shadow-[0_2px_3px_rgb(15_27_45/0.18),0_6px_12px_rgb(15_27_45/0.14)]`;

/** A light button on the blue header, like Hall of Fame. */
export const HEADER_BUTTON =
  "focus-visible:ring-highlight inline-flex h-12 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-bold ring-1 ring-white/35 transition-colors duration-150 ease-out outline-none hover:bg-white/25 focus-visible:ring-3 motion-reduce:transition-none";

/** The inked yellow button, like Draw: lifts under a mouse, sinks pressed. */
export const INKED_BUTTON =
  "border-foreground bg-winner text-foreground focus-visible:ring-highlight inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 px-5 font-extrabold shadow-[4px_4px_0_var(--foreground)] transition-[translate,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--foreground)] focus-visible:ring-3 active:translate-x-1 active:translate-y-1 active:shadow-none active:duration-75 disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none";

/**
 * A page in the board's look: the light blue tint behind everything (via
 * `data-board`, globals.css), a blue header, and the content under it.
 */
export function BoardLayout({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <div data-board className="flex flex-1 flex-col">
      <header className="bg-primary text-primary-foreground border-foreground border-b-2">
        <div className="relative mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-8 pb-8">
          {header}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 pt-10 pb-6">
        {children}
      </main>
    </div>
  );
}

/**
 * A small page in the boards' look, for a form or a message on its own
 * (sign-in, setup, picking a name, not found): the tint behind, and an inked
 * white card in the middle with a handwritten note over the title.
 */
export function CardPage({
  note,
  title,
  intro,
  children,
}: {
  /** The yellow note above the title, in the handwriting. */
  note: string;
  title: string;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div data-board className="flex flex-1 flex-col justify-center px-4 py-10">
      <main className="border-foreground mx-auto flex w-full max-w-sm flex-col gap-5 rounded-xl border-2 bg-white px-5 py-7 shadow-[5px_5px_0_var(--primary)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <p
            className={`${hand.className} bg-winner text-foreground w-fit -rotate-2 rounded-sm px-2.5 py-0.5 text-xl leading-tight font-bold`}
          >
            {note}
          </p>
          <h1 className="text-3xl leading-tight font-black tracking-tight text-balance">
            {title}
          </h1>
          {intro && (
            <div className="text-muted-foreground text-sm text-pretty">
              {intro}
            </div>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
