"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * A podium step's colour, scribbled in with a pen (UI pass, chosen from
 * prototypes on 2026-10-04, "Dense"): one bold line going back and forth
 * across the step while it works from the top-left corner to the bottom
 * right, the way someone colours a shape in. Every pass is a little
 * different: how far the pen moves on, where it turns (just short of the
 * edge or just past it), its angle and its curve. The passes overlap, so
 * there's more colour than white. Drawn on from start to end once the step
 * has risen (`scribble`, globals.css); with reduced motion it's just there.
 */

/** The pen: one line width throughout. */
const PEN = 4.5;
/** Average distance the pen moves along the diagonal per pass. */
const STEP = PEN * 0.85;
/** How much that distance varies, as a fraction of it. */
const STEP_VARIANCE = 0.6;
/** How far past the edge a turn lands, px (it's sometimes just short). */
const OVERSHOOT: [number, number] = [0, 8];
/** How far a stroke may bow off straight, px. */
const BOW = 2.5;
/** How much a stroke's angle may wander, px at its far end. */
const LEAN = 4;

/** A steady pseudo-random number in [0, 1), so re-renders draw the same thing. */
function noise(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const f = (n: number) => n.toFixed(1);

/**
 * The scribble for a `width` × `height` box.
 *
 * Works in a turned frame: `u` runs along the diagonal (top left to bottom
 * right) and `v` across it. At each `u` the exact stretch of `v` inside the
 * box is worked out, so the turns hug the real edges at any size.
 */
export function scribble(width: number, height: number): string {
  const root2 = Math.SQRT2;
  const cx = width / 2;
  const cy = height / 2;
  // From the turned frame back to the box.
  const at = (u: number, v: number) =>
    `${f(cx + (u + v) / root2)} ${f(cy + (u - v) / root2)}`;
  // The stretch of the box across the diagonal at `u`.
  const across = (u: number): [number, number] => [
    Math.max(-root2 * cx - u, u - root2 * cy),
    Math.min(root2 * cx - u, u + root2 * cy),
  ];

  const reach = (width + height) / (2 * root2);
  const points: string[] = [];
  let u = -reach - PEN;
  for (let pass = 0; u < reach + PEN; pass++) {
    const [low, high] = across(Math.max(-reach, Math.min(reach, u)));
    const past = OVERSHOOT[0] + noise(pass, 1) * (OVERSHOOT[1] - OVERSHOOT[0]);
    // Alternate sides: down one side, back up the other.
    const v = pass % 2 ? low - past : high + past;
    const lean = (noise(pass, 2) - 0.5) * LEAN;
    const end = at(u + lean, v);
    if (pass === 0) {
      points.push(`M${end}`);
    } else {
      // A slight bow through the middle of the stroke.
      const bow = (noise(pass, 3) - 0.5) * 2 * BOW;
      points.push(`Q${at(u - STEP / 2 + bow, (low + high) / 2)} ${end}`);
    }
    u += STEP * (1 - STEP_VARIANCE / 2 + noise(pass, 4) * STEP_VARIANCE);
  }
  return points.join(" ");
}

/**
 * The scribbled fill, laid over a step's white face in the step's colour
 * (`className` sets it, as `text-*`). It measures the step and draws to its
 * real size, so the pen line is exactly `PEN` wide on any screen: no
 * stretching, which also keeps the draw-on running the whole length.
 *
 * @param delay - When the scribbling starts, in ms.
 * @param duration - How long it takes, in ms.
 */
export function ScribbleFill({
  delay,
  duration,
  className,
}: {
  delay: number;
  duration: number;
  className: string;
}) {
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
          <path
            d={scribble(size.w, size.h)}
            pathLength={1}
            className="scribble"
            style={
              {
                "--delay": `${delay}ms`,
                "--dur": `${duration}ms`,
              } as React.CSSProperties
            }
            fill="none"
            stroke="currentColor"
            strokeWidth={PEN}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}
