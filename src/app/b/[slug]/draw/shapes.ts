/** A point in tile coordinates. */
export type Point = [x: number, y: number];

/** The shapes the shape tool draws. The line is also the ruler. */
export type ShapeKind = "line" | "rectangle" | "ellipse";

export const SHAPES: { value: ShapeKind; name: string }[] = [
  { value: "line", name: "Line" },
  { value: "rectangle", name: "Rectangle" },
  // "Oval", as MS Paint calls it: the word people already have for it.
  { value: "ellipse", name: "Oval" },
];

/**
 * Where a shape sits on the tile, before colour and size.
 *
 * The three tray shapes are two corners. An oval can also be turned, and a
 * polygon is a list of corners: both only come from the snap assist, which
 * keeps a freehand oval at the angle it was drawn and straightens the edges of
 * a triangle or a tilted four-sided shape without moving its corners.
 */
export type ShapeGeometry =
  | { shape: "line"; from: Point; to: Point }
  | { shape: "rectangle"; from: Point; to: Point }
  | {
      shape: "ellipse";
      from: Point;
      to: Point;
      /** Radians, about the oval's centre. */
      rotation?: number;
    }
  | { shape: "polygon"; points: Point[] };

/**
 * Below this, in tile units, a drag is treated as a tap: there's no shape
 * anyone meant to draw that small, and placing one would leave a stray dot.
 */
const MIN_SHAPE_SPAN = 3;

/** One eighth of a turn, the step a constrained line snaps to. */
const EIGHTH_TURN = Math.PI / 4;

/**
 * Where a shape being dragged out ends.
 *
 * Unconstrained, it's wherever the pointer is. Constrained (Shift held on a
 * keyboard), a rectangle becomes a square and an ellipse a circle, sized by the
 * longer side of the drag and staying on the side the pointer went; a line
 * snaps to the nearest horizontal, vertical or 45° angle, keeping its length.
 */
export function shapeEnd(
  shape: ShapeKind,
  from: Point,
  to: Point,
  constrain: boolean,
): Point {
  if (!constrain) return to;

  const dx = to[0] - from[0];
  const dy = to[1] - from[1];

  if (shape === "line") {
    const length = Math.hypot(dx, dy);
    const angle = Math.round(Math.atan2(dy, dx) / EIGHTH_TURN) * EIGHTH_TURN;
    return [
      from[0] + Math.cos(angle) * length,
      from[1] + Math.sin(angle) * length,
    ];
  }

  const side = Math.max(Math.abs(dx), Math.abs(dy));
  // Math.sign(0) is 0, which would collapse a square dragged straight
  // sideways into a line; treat no movement as the positive direction.
  return [
    from[0] + side * (dx < 0 ? -1 : 1),
    from[1] + side * (dy < 0 ? -1 : 1),
  ];
}

/** Whether a drag was too short to mean a shape (see {@link MIN_SHAPE_SPAN}). */
export function isTooSmall(from: Point, to: Point): boolean {
  return (
    Math.abs(to[0] - from[0]) < MIN_SHAPE_SPAN &&
    Math.abs(to[1] - from[1]) < MIN_SHAPE_SPAN
  );
}

/**
 * The box between two corners, whichever way it was dragged: dragging up and
 * to the left gives the same box as dragging down and to the right.
 */
export function boxBetween(
  from: Point,
  to: Point,
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.min(from[0], to[0]),
    y: Math.min(from[1], to[1]),
    width: Math.abs(to[0] - from[0]),
    height: Math.abs(to[1] - from[1]),
  };
}
