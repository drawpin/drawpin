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

/** Which corner handle, if any, is within `reach` of the point. */
export function handleAt(
  rect: Rect,
  point: Point,
  reach: number,
): Corner | null {
  const corners = cornersOf(rect);
  for (let index = 0; index < corners.length; index++) {
    const [x, y] = corners[index];
    if (Math.hypot(point[0] - x, point[1] - y) <= reach) return index as Corner;
  }
  return null;
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
 */
export function resizeFromCorner(
  start: Rect,
  corner: Corner,
  pointer: Point,
): Rect {
  const corners = cornersOf(start);
  const [anchorX, anchorY] = corners[(corner + 2) % 4];
  const [cornerX, cornerY] = corners[corner];
  const directionX = Math.sign(cornerX - anchorX);
  const directionY = Math.sign(cornerY - anchorY);

  // How far the pointer is out from the anchor, along the corner's own
  // direction; the larger of the two sides decides the new size.
  const reachX = Math.max(0, (pointer[0] - anchorX) * directionX);
  const reachY = Math.max(0, (pointer[1] - anchorY) * directionY);
  const smallest = MIN_SELECTION / Math.min(start.width, start.height);
  const scale = Math.max(reachX / start.width, reachY / start.height, smallest);

  const width = start.width * scale;
  const height = start.height * scale;
  return {
    x: directionX > 0 ? anchorX : anchorX - width,
    y: directionY > 0 ? anchorY : anchorY - height,
    width,
    height,
  };
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
