/**
 * A podium step's colour, doodled in with a pen (UI pass, 2026-10-03): one
 * long, thin stroke hatching back and forth on the diagonal, from bottom
 * right to top left, drawn on from start to end once the step has risen
 * (`scribble`, globals.css). The white between the lines stays, so the
 * finished step reads as quick pen hatching rather than a flat fill. With
 * reduced motion it's simply there.
 */

/** Average pixels between passes, and the pen's line width. */
const PASS = 3.4;
const STROKE = 1.8;
/** The hatching's angle: lines run bottom right to top left ("\"). */
const ANGLE = 45;

/**
 * A steady pseudo-random number in [0, 1) for pass `i`, so a re-render
 * draws the same doodle.
 */
function noise(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * The hatching for a `width` × `height` box, drawn flat and then turned to
 * the diagonal (the path's `transform`). Each pass bows a little, leans a
 * little differently and sits a slightly uneven distance from the last, like
 * a hand going fast, but never close enough to merge. The passes are long
 * enough to cross the whole box at any angle, and the turns between them
 * fall outside it, where the step crops them.
 */
function hatching(width: number, height: number): string {
  // Long enough to cover the box's diagonal however it's turned.
  const reach = (width + height) / 2 + 12;
  const points: string[] = [];
  let pass = 0;
  for (let y = -reach; y < reach; pass++) {
    const lean = (noise(pass, 1) - 0.5) * 2.4;
    const bow = (noise(pass, 2) - 0.5) * 2.6;
    const ends: [number, number][] = [
      [-reach, y],
      [reach, y + lean],
    ];
    const [from, to] = pass % 2 ? [ends[1], ends[0]] : ends;
    points.push(
      `${pass === 0 ? "M" : "L"}${from[0].toFixed(1)} ${from[1].toFixed(1)}`,
      // A slight curve through the middle, like a wrist's arc.
      `Q0 ${(y + lean / 2 + bow).toFixed(1)} ${to[0].toFixed(1)} ${to[1].toFixed(1)}`,
    );
    y += PASS * (0.8 + noise(pass, 3) * 0.4);
  }
  return points.join(" ");
}

/**
 * The doodled fill, laid over a step's white face, in the step's colour
 * (`className` sets it, as `text-*`).
 *
 * @param height - The step's height in px, to size the doodle to it.
 * @param delay - When the doodling starts, in ms.
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
  // The step's width varies with the screen. Rather than stretch the doodle
  // to fit, which skews the line's measured length so the draw-on stops
  // short on wide screens, it's drawn wider than any step and the step crops
  // it, unscaled ("slice").
  const width = 240;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
    >
      <path
        d={hatching(width, height)}
        transform={`translate(${width / 2} ${height / 2}) rotate(${ANGLE})`}
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
