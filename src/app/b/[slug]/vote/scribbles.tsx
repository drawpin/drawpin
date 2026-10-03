/**
 * A podium step's colour, scribbled in with a pen (UI pass, 2026-10-03):
 * one long, thin stroke zig-zagging tightly back and forth from top to
 * bottom, drawn on from start to end once the step has risen (`scribble`,
 * globals.css). The white between the lines stays, so the finished step
 * reads as quick pen hatching rather than a flat fill. With reduced motion
 * it's simply there.
 */

/** Pixels between passes, and the pen's line width: tight, with white between. */
const PASS = 4.5;
const STROKE = 2.6;
/** How far each pass runs past the step's edges, so the turns don't show. */
const OVERSHOOT = 34;

/**
 * The zig-zag for a step `width` × `height` px: each pass runs past both
 * edges (the step clips it) and wobbles a little, like a hand going fast.
 */
function zigzag(width: number, height: number): string {
  const points: string[] = [];
  for (let y = 2, pass = 0; y < height + PASS; y += PASS, pass++) {
    // A steady wobble, so a re-render doesn't redraw a different scribble.
    const wobble = (((pass * 7) % 5) - 2) * 0.6;
    const from = pass % 2 ? width + OVERSHOOT : -OVERSHOOT;
    const to = pass % 2 ? -OVERSHOOT : width + OVERSHOOT;
    if (pass === 0) points.push(`M${from} ${y}`);
    points.push(`L${to} ${y + PASS * 0.6 + wobble}`);
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
