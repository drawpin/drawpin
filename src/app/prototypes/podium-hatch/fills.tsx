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

/**
 * Straight hatching at `angle` degrees across a `w` × `h` box, `gap` apart
 * (centre to centre). Passes are parallel and long enough to cross the box
 * at any angle; the turns between them fall outside it.
 */
function hatch(w: number, h: number, angle: number, gap: number): string {
  const reach = (w + h) / 2 + 12;
  const cos = Math.cos((angle * Math.PI) / 180);
  const sin = Math.sin((angle * Math.PI) / 180);
  // Turn a point from the flat frame to the angled one, about the centre.
  const at = (x: number, y: number) =>
    `${f(w / 2 + x * cos - y * sin)} ${f(h / 2 + x * sin + y * cos)}`;
  const points: string[] = [];
  let pass = 0;
  for (let y = -reach; y < reach; y += gap, pass++) {
    const ends = [at(-reach, y), at(reach, y)];
    const [from, to] = pass % 2 ? [ends[1], ends[0]] : ends;
    points.push(`${pass === 0 ? "M" : "L"}${from}`, `L${to}`);
  }
  return points.join(" ");
}

/** Marker hatch: bold, straight, evenly spaced diagonals. */
export const marker = (w: number, h: number) => [hatch(w, h, 45, PEN * 2)];

/** Cross-hatch: a diagonal pass, then a second across it. */
export const cross = (w: number, h: number) => [
  hatch(w, h, 45, PEN * 3),
  hatch(w, h, -45, PEN * 3),
];

/**
 * Scribble: colouring in. The pen goes back and forth across the step with
 * its turns inside the edges, working down, so the V of each turn shows.
 */
export const scribble = (w: number, h: number) => {
  const inset = PEN / 2;
  const drop = PEN * 1.5;
  const points = [`M${f(inset)} ${f(-PEN)}`];
  for (let y = -PEN, pass = 0; y < h + drop * 2; pass++) {
    y += drop * (0.85 + noise(pass, 1) * 0.3);
    const x = pass % 2 ? inset : w - inset;
    points.push(`L${f(x)} ${f(y)}`);
  }
  return [points.join(" ")];
};

/**
 * Loops: a coil doodled along rows, left to right then back, each loop a
 * little different, like a pen going round while it moves along.
 */
export const loops = (w: number, h: number) => {
  const radius = PEN * 2;
  const row = radius * 1.5;
  const advance = radius * 0.32; // along the row per radian
  const points: string[] = [];
  let first = true;
  for (let r = 0, y = 0; y < h + radius; r++, y += row) {
    const forward = r % 2 === 0;
    const length = w + radius * 4;
    for (let t = 0; t * advance < length; t += 0.3) {
      const along = -radius * 2 + t * advance;
      const wobble = 1 + (noise(Math.floor(t / 6.28) + r * 40, 2) - 0.5) * 0.3;
      const x = (forward ? along : w - along) + radius * wobble * Math.cos(t);
      const yy = y + radius * wobble * Math.sin(forward ? t : -t);
      points.push(`${first ? "M" : "L"}${f(x)} ${f(yy)}`);
      first = false;
    }
  }
  return [points.join(" ")];
};

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
