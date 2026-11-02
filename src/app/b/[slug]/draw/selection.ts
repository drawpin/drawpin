import type { Point } from "./shapes";

/** A box on the tile, in tile units. */
export type Rect = { x: number; y: number; width: number; height: number };

/** Corners of a box, clockwise from the top left — the order handles use. */
export type Corner = 0 | 1 | 2 | 3;

/**
 * A lifted selection can't be shrunk below this, in tile units: smaller than
 * a fingertip, it can't be grabbed again to make it bigger.
 */
const MIN_SELECTION = 8;

/**
 * The whole-pixel box around a lasso loop, kept on the tile. `null` when the
 * loop encloses too little to be worth lifting — a tap, or a scribble along a
 * line.
 */
export function selectionBounds(loop: Point[], tileSize: number): Rect | null {
  if (loop.length < 3) return null;

  const xs = loop.map(([x]) => x);
  const ys = loop.map(([, y]) => y);
  const left = Math.max(0, Math.floor(Math.min(...xs)));
  const top = Math.max(0, Math.floor(Math.min(...ys)));
  const right = Math.min(tileSize, Math.ceil(Math.max(...xs)));
  const bottom = Math.min(tileSize, Math.ceil(Math.max(...ys)));

  const width = right - left;
  const height = bottom - top;
  if (width < MIN_SELECTION || height < MIN_SELECTION) return null;
  return { x: left, y: top, width, height };
}

/** At or below this much ink (0 = white, 1 = full), a pixel is paper. */
const PAPER_INK = 0.04;

/** At or above this much ink, a pixel is fully solid. */
const SOLID_INK = 0.3;

/**
 * Makes the white paper in lifted pixels see-through, in place.
 *
 * Without this a lasso lifts a patch of paper along with the drawing, and
 * moving it over anything else covers that with a white blob.
 *
 * Only paper goes: a pixel's opacity ramps from nothing at near-white up to
 * full at a light tint, and its colour is never changed. So every colour
 * stays exactly itself and fully solid — the usual colour-to-transparency
 * approach turns red partly see-through, which looks fine over white and
 * purple over blue — while the faintest outer edge of a stroke fades out
 * instead of leaving a white rim.
 *
 * Pixels outside the loop are already transparent and are left alone.
 */
export function whiteToAlpha(pixels: Uint8ClampedArray): void {
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha === 0) continue;

    // How far the pixel is from white, 0 (white) to 1.
    const ink =
      Math.max(
        255 - pixels[index],
        255 - pixels[index + 1],
        255 - pixels[index + 2],
      ) / 255;
    const strength = Math.min(
      1,
      Math.max(0, (ink - PAPER_INK) / (SOLID_INK - PAPER_INK)),
    );
    pixels[index + 3] = Math.round(alpha * strength);
  }
}

/** The four corners of a box, clockwise from the top left. */
function cornersOf(rect: Rect): [Point, Point, Point, Point] {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  return [
    [rect.x, rect.y],
    [right, rect.y],
    [right, bottom],
    [rect.x, bottom],
  ];
}

export function contains(rect: Rect, [x, y]: Point): boolean {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

/**
 * The box after dragging one of its corners to `pointer`.
 *
 * The opposite corner stays put and the proportions are kept, so a drawing
 * gets bigger or smaller rather than stretched — on a phone there's no Shift
 * key to ask for that. The corner can't be dragged past the one opposite it,
 * which would turn the selection inside out.
 *
 * A turned box is resized along its own sides: the pointer is read in the
 * box's unturned frame, and the result is shifted so the opposite corner
 * stays where it is on the tile. Without that shift the box would grow about
 * the unturned anchor, and the turn — always about the centre, which has
 * moved — would swing the pinned corner out from under the hand.
 *
 * @param angle - How far the box is turned, in radians, about its centre.
 */
export function resizeFromCorner(
  start: Rect,
  corner: Corner,
  pointer: Point,
  angle = 0,
): Rect {
  const corners = cornersOf(start);
  const [anchorX, anchorY] = corners[(corner + 2) % 4];
  const [cornerX, cornerY] = corners[corner];
  const directionX = Math.sign(cornerX - anchorX);
  const directionY = Math.sign(cornerY - anchorY);
  const [localX, localY] = toLocal(pointer, start, angle);

  // How far the pointer is out from the anchor, along the corner's own
  // direction; the larger of the two sides decides the new size.
  const reachX = Math.max(0, (localX - anchorX) * directionX);
  const reachY = Math.max(0, (localY - anchorY) * directionY);
  const smallest = MIN_SELECTION / Math.min(start.width, start.height);
  const scale = Math.max(reachX / start.width, reachY / start.height, smallest);

  const width = start.width * scale;
  const height = start.height * scale;
  const resized = {
    x: directionX > 0 ? anchorX : anchorX - width,
    y: directionY > 0 ? anchorY : anchorY - height,
    width,
    height,
  };
  if (angle === 0) return resized;

  // Where the anchor lands on the tile with each box turned about its own
  // centre; the difference is how far the new box has to move back.
  const anchor: Point = [anchorX, anchorY];
  const [beforeX, beforeY] = rotatePoint(anchor, centerOf(start), angle);
  const [afterX, afterY] = rotatePoint(anchor, centerOf(resized), angle);
  return moveBy(resized, beforeX - afterX, beforeY - afterY);
}

export function moveBy(start: Rect, dx: number, dy: number): Rect {
  return { ...start, x: start.x + dx, y: start.y + dy };
}

/** Whether two boxes are the same, i.e. a selection was put back untouched. */
export function sameRect(a: Rect, b: Rect): boolean {
  return (
    a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
  );
}

/** The middle of a box: what a selection turns about. */
export function centerOf(rect: Rect): Point {
  return [rect.x + rect.width / 2, rect.y + rect.height / 2];
}

/** `point` turned by `angle` radians about `center` (clockwise on screen). */
export function rotatePoint(point: Point, center: Point, angle: number): Point {
  if (angle === 0) return point;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point[0] - center[0];
  const dy = point[1] - center[1];
  return [center[0] + dx * cos - dy * sin, center[1] + dx * sin + dy * cos];
}

/**
 * A point on the tile, in the frame of a box turned by `angle` about its
 * centre: where it would be if the box were turned back square. Hit-testing
 * and resizing a turned selection both work in this frame.
 */
export function toLocal(point: Point, rect: Rect, angle: number): Point {
  return rotatePoint(point, centerOf(rect), -angle);
}

/**
 * Where the rotate knob sits: `stem` above the middle of the top edge, turned
 * with the box.
 *
 * @param stem - How far above the edge, in tile units.
 */
export function rotateKnob(rect: Rect, angle: number, stem: number): Point {
  const center = centerOf(rect);
  return rotatePoint([center[0], rect.y - stem], center, angle);
}

/** The direction from `center` to `point`, in radians. */
export function angleFrom(center: Point, point: Point): number {
  return Math.atan2(point[1] - center[1], point[0] - center[0]);
}

const DEGREE = Math.PI / 180;

/** With Shift held, a turn moves in steps this size. */
const SHIFT_STEP = 15 * DEGREE;

/**
 * Without Shift, a turn this close to upright, sideways or upside down is
 * made exact: a finger can't hold 90° to the degree, and a drawing a degree
 * off square looks like a mistake.
 */
const SQUARE_PULL = 4 * DEGREE;

/**
 * Tidies an angle someone is turning a selection to, and keeps it in
 * [-π, π).
 *
 * @param stepped - Shift is held: snap to the nearest 15°.
 */
export function snapAngle(angle: number, stepped: boolean): number {
  const turn = 2 * Math.PI;
  let tidy = angle - turn * Math.floor((angle + Math.PI) / turn);
  const step = stepped ? SHIFT_STEP : Math.PI / 2;
  const snapped = Math.round(tidy / step) * step;
  if (stepped || Math.abs(tidy - snapped) <= SQUARE_PULL) tidy = snapped;
  // π and -π are the same turn; keeping one keeps "was it turned" simple.
  if (tidy >= Math.PI - 1e-9) tidy -= turn;
  // Rounding can leave -0, which would read as a turn that isn't one.
  return tidy === 0 ? 0 : tidy;
}

/** What a finger landing on a selection takes hold of. */
export type Grab =
  { kind: "move" } | { kind: "corner"; corner: Corner } | { kind: "rotate" };

/**
 * What a pointer at `point` grabs on a selection turned by `angle`: the
 * nearest handle within `reach` (a corner, or the rotate knob at the end of a
 * `stem`-long stem), else the box itself to move it, else nothing.
 *
 * The nearest handle wins rather than the first one checked: on a small
 * selection the handles' reaches overlap, and a finger should get the one
 * it's closest to.
 */
export function grabAt(
  rect: Rect,
  angle: number,
  point: Point,
  reach: number,
  stem: number,
): Grab | null {
  // Worked out in the box's own frame, where it's square to the tile.
  const [x, y] = toLocal(point, rect, angle);
  const handles: [Grab, Point][] = [
    ...cornersOf(rect).map((corner, index): [Grab, Point] => [
      { kind: "corner", corner: index as Corner },
      corner,
    ]),
    [{ kind: "rotate" }, rotateKnob(rect, 0, stem)],
  ];
  let nearest: Grab | null = null;
  let nearestDistance = reach;
  for (const [grab, [hx, hy]] of handles) {
    const distance = Math.hypot(x - hx, y - hy);
    if (distance <= nearestDistance) {
      nearest = grab;
      nearestDistance = distance;
    }
  }
  if (nearest) return nearest;
  return contains(rect, [x, y]) ? { kind: "move" } : null;
}
