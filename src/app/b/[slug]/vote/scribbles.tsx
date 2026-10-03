/**
 * A podium step's colour, scribbled in with a pen (UI pass, 2026-10-03):
 * one long, thin stroke zig-zagging tightly back and forth from top to
 * bottom, drawn on from start to end once the step has risen (`scribble`,
 * globals.css). The white between the lines stays, so the finished step
 * reads as quick pen hatching rather than a flat fill. With reduced motion
 * it's simply there.
 */

/** Pixels between passes, and the pen's line width: tight, with white between. */
const PASS = 3;
const STROKE = 1.8;
/** How far each pass runs past the step's edges, so the turns don't show. */
const OVERSHOOT = 34;
/** How much lower each pass is at the right than the left: drawn, not ruled. */
const TILT = 1.4;

/**
 * The zig-zag for a step `width` × `height` px. Every pass is parallel, high
 * on the left and low on the right whichever way the pen is going, so the
 * spacing stays even from edge to edge (passes that sloped opposite ways
 * bunched up at one side and gapped at the other). The turns happen outside
 * the step, which clips them, and the first and last passes sit beyond its
 * top and bottom, so no edge is left bare.
 */
function zigzag(width: number, height: number): string {
  const left = -OVERSHOOT;
  const right = width + OVERSHOOT;
  const points: string[] = [];
  for (let y = -PASS, pass = 0; y < height + PASS * 2; y += PASS, pass++) {
    // A hand's small unevenness, steady so a re-render draws the same thing,
    // and too small (a fraction of the gap) for neighbouring lines to touch.
    const jitter = (((pass * 13) % 5) - 2) * 0.12;
    const tilt = TILT + (((pass * 7) % 3) - 1) * 0.25;
    const leftEnd = `${left} ${y + jitter}`;
    const rightEnd = `${right} ${y + jitter + tilt}`;
    const [from, to] = pass % 2 ? [rightEnd, leftEnd] : [leftEnd, rightEnd];
    points.push(`${pass === 0 ? "M" : "L"}${from}`, `L${to}`);
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
  // The step's width varies with the screen. Rather than stretch the
  // scribble to fit, which skews the line's measured length so the draw-on
  // stops short on wide screens, it's drawn wider than any step and the step
  // crops it, unscaled ("slice").
  const width = 240;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
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
