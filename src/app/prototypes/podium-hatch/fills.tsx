"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** What the podium hands a step's fill. */
export type FillProps = {
  height: number;
  delay: number;
  duration: number;
  /** The step's colour, as a `text-*` class. */
  className: string;
};

/** One pen for every version: the same, thicker line throughout. */
const PEN = 4.5;

/** A steady pseudo-random number in [0, 1), so re-renders draw the same thing. */
function noise(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const f = (n: number) => n.toFixed(1);

/** How loose a hand the scribble is drawn with. */
type Hand = {
  /** Average distance the pen moves along the diagonal per pass. */
  step: number;
  /** How much that distance varies, as a fraction of it. */
  stepVariance: number;
  /** How far past the edge a turn may land (negative: short of it), px. */
  overshoot: [number, number];
  /** How far a stroke may bow off straight, px. */
  bow: number;
  /** How much a stroke's angle may wander, px at its far end. */
  lean: number;
};

/**
 * A scribble that sweeps from the box's top-left corner to its bottom-right,
 * the pen going back and forth across the diagonal as it moves along it,
 * the way someone colours a shape in. Every pass is a little different:
 * how far the pen moves on, where it turns (just short of the edge, or just
 * past it), the angle, and the curve.
 *
 * Works in a turned frame: `u` runs along the diagonal (top left to bottom
 * right), `v` across it. At each `u` the exact stretch of `v` inside the box
 * is worked out, so the turns hug the real edges at any size.
 */
function diagonalScribble(w: number, h: number, hand: Hand): string {
  const root2 = Math.SQRT2;
  const cx = w / 2;
  const cy = h / 2;
  // From the turned frame back to the box.
  const at = (u: number, v: number) =>
    `${f(cx + (u + v) / root2)} ${f(cy + (u - v) / root2)}`;
  // The stretch of the box across the diagonal at `u`.
  const across = (u: number): [number, number] => [
    Math.max(-root2 * cx - u, u - root2 * cy),
    Math.min(root2 * cx - u, u + root2 * cy),
  ];

  const reach = (w + h) / (2 * root2);
  const points: string[] = [];
  let u = -reach - PEN;
  for (let pass = 0; u < reach + PEN; pass++) {
    const [low, high] = across(Math.max(-reach, Math.min(reach, u)));
    const [min, max] = hand.overshoot;
    const past = min + noise(pass, 1) * (max - min);
    // Alternate sides: down one side, back up the other.
    const v = pass % 2 ? low - past : high + past;
    const lean = (noise(pass, 2) - 0.5) * hand.lean;
    const end = at(u + lean, v);
    if (pass === 0) {
      points.push(`M${end}`);
    } else {
      // A slight bow through the middle of the stroke.
      const bow = (noise(pass, 3) - 0.5) * 2 * hand.bow;
      points.push(`Q${at(u - hand.step / 2 + bow, (low + high) / 2)} ${end}`);
    }
    u +=
      hand.step *
      (1 - hand.stepVariance / 2 + noise(pass, 4) * hand.stepVariance);
  }
  return points.join(" ");
}

/** Quick: a fast, slightly uneven scribble. */
export const quick = (w: number, h: number) => [
  diagonalScribble(w, h, {
    step: PEN * 1.25,
    stepVariance: 0.5,
    overshoot: [-1, 6],
    bow: 1.5,
    lean: 3,
  }),
];

/** Loose: curvier strokes and wilder turns, scribbling in a hurry. */
export const loose = (w: number, h: number) => [
  diagonalScribble(w, h, {
    step: PEN * 1.4,
    stepVariance: 0.8,
    overshoot: [-3, 12],
    bow: 5,
    lean: 7,
  }),
];

/** Dense: tighter passes that overlap, more colour than white. */
export const dense = (w: number, h: number) => [
  diagonalScribble(w, h, {
    step: PEN * 0.85,
    stepVariance: 0.6,
    overshoot: [0, 8],
    bow: 2.5,
    lean: 4,
  }),
];

export type Generator = (w: number, h: number) => string[];

/**
 * A step's fill, drawn to the step's real size (measured), so the pen line
 * is exactly `PEN` wide on any screen: no stretching, and the draw-on runs
 * the whole length. Several paths draw one after another.
 */
export function makeFill(generate: Generator) {
  return function Fill({ delay, duration, className }: FillProps) {
    const box = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<{ w: number; h: number } | null>(null);
    useLayoutEffect(() => {
      const element = box.current;
      if (!element) return;
      const measure = () =>
        setSize({ w: element.clientWidth, h: element.clientHeight });
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }, []);
    const paths = size ? generate(size.w, size.h) : [];
    const each = duration / Math.max(paths.length, 1);
    return (
      <div
        ref={box}
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${className}`}
      >
        {size && (
          <svg
            viewBox={`0 0 ${size.w} ${size.h}`}
            className="absolute inset-0 size-full"
          >
            {paths.map((d, index) => (
              <path
                key={index}
                d={d}
                pathLength={1}
                className="scribble"
                style={
                  {
                    "--delay": `${delay + index * each}ms`,
                    "--dur": `${each}ms`,
                  } as React.CSSProperties
                }
                fill="none"
                stroke="currentColor"
                strokeWidth={PEN}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
        )}
      </div>
    );
  };
}
