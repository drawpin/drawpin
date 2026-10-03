import type { CSSProperties } from "react";

/**
 * Hand-drawn bits for the podium (UI pass, 2026-10-03): ink line art that
 * scribbles itself on, stroke by stroke, like someone doodling on the steps.
 * Each path carries `scribble` (globals.css), which draws it from start to
 * end after `--delay`; with reduced motion they're simply there.
 */

/** Timing for one stroke: when it starts and how long it takes, in ms. */
const stroke = (delay: number, duration = 420): CSSProperties =>
  ({ "--delay": `${delay}ms`, "--dur": `${duration}ms` }) as CSSProperties;

/** The paths a trophy is drawn in, in the order a hand would draw them. */
const TROPHY = [
  // The cup, a little lopsided.
  "M14.5 8.5 C20 7.6 28 7.6 33.5 8.4 C33.8 13 33.6 18.5 32 22.5 C30.2 27 27 29.6 24 29.7 C20.8 29.6 17.6 27 15.9 22.6 C14.4 18.6 14.2 13 14.5 8.5 Z",
  // The handles.
  "M14.6 11.6 C9 10.8 7.4 14.8 9 18.2 C10.2 20.6 12.8 21.6 15.6 21.4",
  "M33.4 11.6 C39 10.8 40.6 14.8 39 18.2 C37.8 20.6 35.2 21.6 32.4 21.4",
  // The stem and the base.
  "M24 29.8 C23.8 31.8 24.2 33.6 24 35.6",
  "M17.2 36 C21.6 35.4 26.6 35.4 30.8 36 C31.2 37.8 31.1 39.6 30.8 41.2 C26.4 41.7 21.6 41.7 17.2 41.2 C16.9 39.6 16.9 37.8 17.2 36 Z",
  // A star on the cup.
  "M24 12.6 L25.4 16 L29 16.2 L26.2 18.4 L27.2 21.8 L24 19.9 L20.8 21.8 L21.8 18.4 L19 16.2 L22.6 16 Z",
];

/**
 * A trophy, drawn in ink. `faint` is for a place nobody holds yet.
 *
 * @param delay - When the first stroke starts, in ms.
 */
export function Trophy({
  size,
  delay,
  faint = false,
}: {
  size: number;
  delay: number;
  faint?: boolean;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={`-rotate-3 ${faint ? "opacity-30" : ""}`}
    >
      {TROPHY.map((d, index) => (
        <path
          key={index}
          d={d}
          pathLength={1}
          className="scribble"
          style={stroke(delay + index * 120, index === 0 ? 520 : 320)}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

/** Small doodles, each in its own 24 × 24 box. */
const DOODLES = {
  sparkle:
    "M12 2.5 C12.4 8.4 13.6 11 21.5 12 C13.6 13 12.4 15.6 12 21.5 C11.6 15.6 10.4 13 2.5 12 C10.4 11 11.6 8.4 12 2.5 Z",
  star: "M12 3.2 L14.4 9.4 L20.8 9.8 L15.9 13.9 L17.6 20.4 L12 16.8 L6.4 20.4 L8.1 13.9 L3.2 9.8 L9.6 9.4 Z",
  squiggle:
    "M2 15 C4.5 6 7.5 6 9 12 C10.5 18 13.5 18 15 12 C16.5 6 19.5 6 22 13",
  loop: "M3 17 C3 9 11 5 14 10 C16.4 14 11 17.4 9.4 13.4 C7.8 9.4 13.6 5.2 18.6 7.4 C21 8.6 21.6 11 21 13",
} as const;

/** Which doodles go on each step, and where (as percentages of the step). */
const STEP_DOODLES: Record<
  1 | 2 | 3,
  { kind: keyof typeof DOODLES; left: string; top: string; size: number }[]
> = {
  1: [
    { kind: "sparkle", left: "8%", top: "10%", size: 18 },
    { kind: "sparkle", left: "74%", top: "18%", size: 14 },
    { kind: "star", left: "78%", top: "62%", size: 13 },
  ],
  2: [
    { kind: "squiggle", left: "6%", top: "66%", size: 20 },
    { kind: "sparkle", left: "76%", top: "12%", size: 13 },
  ],
  3: [
    { kind: "loop", left: "70%", top: "58%", size: 17 },
    { kind: "star", left: "8%", top: "14%", size: 11 },
  ],
};

/**
 * The doodles scribbled around a step's trophy, a different few on each.
 *
 * @param delay - When the first doodle starts, in ms.
 */
export function StepDoodles({
  place,
  delay,
}: {
  place: 1 | 2 | 3;
  delay: number;
}) {
  return (
    <>
      {STEP_DOODLES[place].map((doodle, index) => (
        <svg
          key={index}
          aria-hidden
          viewBox="0 0 24 24"
          width={doodle.size}
          height={doodle.size}
          className="text-foreground/70 pointer-events-none absolute"
          style={{ left: doodle.left, top: doodle.top }}
        >
          <path
            d={DOODLES[doodle.kind]}
            pathLength={1}
            className="scribble"
            style={stroke(delay + index * 160, 380)}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </>
  );
}
