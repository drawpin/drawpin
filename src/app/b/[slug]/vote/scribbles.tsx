/**
 * A podium step's colour, scribbled in like crayon (UI pass, 2026-10-03):
 * one long stroke zig-zagging back and forth from top to bottom, drawn on
 * from start to end once the step has risen (`scribble`, globals.css). The
 * gaps between passes stay, so the finished step keeps its crayon texture.
 * With reduced motion it's simply filled in.
 */

/** Pixels between passes; the stroke is wider, so passes overlap a little. */
const PASS = 7;
const STROKE = 13;
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
    const wobble = ((pass * 7) % 5) - 2;
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
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
