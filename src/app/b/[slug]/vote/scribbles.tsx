/**
 * A podium step's colour, scribbled in with a pen (UI pass, 2026-10-03):
 * one long, thin stroke zig-zagging tightly back and forth from top to
 * bottom, drawn on from start to end once the step has risen (`scribble`,
 * globals.css). The white between the lines stays, so the finished step
 * reads as quick pen hatching rather than a flat fill. With reduced motion
 * it's simply there.
 */

/** Pixels between passes, and the pen's line width: tight, with white between. */
const PASS = 3.4;
const STROKE = 2;
/** How far each pass runs past the step's edges, so the turns don't show. */
const OVERSHOOT = 34;
/** How much each pass drops across the step, so it looks drawn, not ruled. */
const TILT = 1.4;

/**
 * The zig-zag for a step `width` × `height` px. Every pass leans the same
 * way and they're evenly spaced, so the hatching is even from edge to edge;
 * the turns happen outside the step (it clips them), and the first and last
 * passes sit beyond its top and bottom, so no edge is left bare.
 */
function zigzag(width: number, height: number): string {
  const left = -OVERSHOOT;
  const right = width + OVERSHOOT;
  const points: string[] = [];
  for (let y = -PASS, pass = 0; y < height + PASS * 2; y += PASS, pass++) {
    // A steady wobble, so a re-render doesn't redraw a different scribble.
    const wobble = (((pass * 7) % 5) - 2) * 0.3;
    const [from, to] = pass % 2 ? [right, left] : [left, right];
    points.push(`${pass === 0 ? "M" : "L"}${from} ${y + wobble}`);
    points.push(`L${to} ${y + TILT + wobble}`);
  }
  return points.join(" ");
}

/**
 * The scribbled fill, laid over a step's white face, in the step's colour
 * (`className` sets it, as `text-*`).
 *
 * @param height - The step's height in px, to size the scribble to it.
 * @param delay - When the scribbling starts, in ms.
 * @param duration - How long it takes, in ms.
 */
export function ScribbleFill({
  height,
  delay,
  duration,
  className,
}: {
  height: number;
  delay: number;
  duration: number;
  className: string;
}) {
  // The step's width varies with the screen; the scribble is drawn for a
  // typical width and stretched to fit, which only widens it a little.
  const width = 120;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
    >
      <path
        d={zigzag(width, height)}
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
        strokeWidth={STROKE}
        // The step stretches the scribble sideways; keep the pen's line even.
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
