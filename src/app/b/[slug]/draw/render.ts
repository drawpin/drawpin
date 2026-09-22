import { getStroke } from "perfect-freehand";
import { floodFill } from "./flood-fill";
import { strokeToSvgPath } from "./stroke-path";

/**
 * The drawing's own coordinate system, and the size the finished tile is
 * exported at. Strokes are stored in these units whatever the screen is, so a
 * drawing made on a phone and one made on a laptop are the same picture.
 */
export const TILE_SIZE = 768;

/** Lines in the guide grid, across and down. */
export const GRID_CELLS = 8;

/** What the stroke was drawn with. */
export type Brush = "pen" | "marker" | "spray" | "eraser";

/** The tile's paper, and so what the eraser paints back onto it. */
export const PAPER = "#ffffff";

export type Stroke = {
  kind: "stroke";
  points: [x: number, y: number, pressure: number][];
  color: string;
  size: number;
  brush: Brush;
  /**
   * Fixes the scatter of a spray stroke. Drawings are re-rendered constantly —
   * on undo, on zoom, on every frame of a stroke — so the dots have to land in
   * the same places every time or the drawing shimmers.
   */
  seed: number;
  /** Mice and fingers report no real pressure, so it's simulated from speed. */
  simulatePressure: boolean;
};

/**
 * Dots per fill. Small enough that passing over the same place twice in one
 * stroke darkens it, large enough that a long stroke is still a few dozen
 * fills rather than a few thousand.
 */
const SPRAY_BATCH = 40;

/** A dot of spray, in tile coordinates. */
export type SprayDot = { x: number; y: number; radius: number };

/** Small, fast, and identical everywhere: the same seed gives the same dots. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Where an airbrush would have put paint along a stroke.
 *
 * Dots are spaced by brush size rather than by point, so a long stroke costs
 * no more per pixel than a short one and the whole path stays one fill.
 */
export function sprayDots(
  points: [number, number, number][],
  size: number,
  seed: number,
): SprayDot[] {
  const random = seededRandom(seed);
  const spread = size / 2;
  const dotRadius = Math.max(size / 16, 0.7);
  const spacing = Math.max(size / 10, 1.5);
  const dots: SprayDot[] = [];

  const scatter = (x: number, y: number) => {
    for (let n = 0; n < 3; n++) {
      const angle = random() * Math.PI * 2;
      // Square-rooted so dots spread evenly over the circle rather than
      // bunching in the middle.
      const distance = Math.sqrt(random()) * spread;
      dots.push({
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        radius: dotRadius,
      });
    }
  };

  if (points.length === 1) {
    scatter(points[0][0], points[0][1]);
    return dots;
  }

  for (let i = 1; i < points.length; i++) {
    const [fromX, fromY] = points[i - 1];
    const [toX, toY] = points[i];
    const length = Math.hypot(toX - fromX, toY - fromY);
    const steps = Math.max(Math.floor(length / spacing), 1);

    for (let step = 0; step < steps; step++) {
      const along = step / steps;
      scatter(fromX + (toX - fromX) * along, fromY + (toY - fromY) * along);
    }
  }

  return dots;
}

/**
 * An area coloured in by the bucket.
 *
 * The shape is worked out once, when the bucket is tapped, and kept as a
 * picture of just that area. Everything drawn before it can never change
 * afterwards — undo only ever removes from the end — so there's nothing to
 * recompute, and replaying a fill is a single paste.
 */
export type Fill = {
  kind: "fill";
  color: string;
  mask: { canvas: HTMLCanvasElement; x: number; y: number };
};

/** One thing someone did to the tile, in the order they did it. */
export type DrawOp = Stroke | Fill;

export type Scene = {
  ops: DrawOp[];
  /** The stroke being drawn right now, if any. */
  activeStroke: Stroke | null;
  /** Drawn over the drawing, and never part of the exported tile. */
  showGrid: boolean;
};

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.brush === "spray") {
    const dots = sprayDots(stroke.points, stroke.size, stroke.seed);

    context.save();
    context.globalAlpha = 0.35;
    context.fillStyle = stroke.color;

    // Drawn in batches rather than one path or one dot at a time. One path
    // would be flat wherever it crossed itself, and one fill per dot would
    // stutter on a phone; each batch lingers into the next, so hovering in one
    // place builds up the way an airbrush does.
    for (let start = 0; start < dots.length; start += SPRAY_BATCH) {
      const path = new Path2D();
      for (const dot of dots.slice(start, start + SPRAY_BATCH)) {
        path.moveTo(dot.x + dot.radius, dot.y);
        path.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
      }
      context.fill(path);
    }

    context.restore();
    return;
  }

  // A marker has no pressure at all — an even line is what makes a shaky one
  // look deliberate — and enough transparency that crossing an earlier stroke
  // darkens where they meet. An eraser is the same shape in the colour of the
  // paper: the tile is always white underneath, so there's nothing to reveal.
  const isMarker = stroke.brush === "marker";
  const isEraser = stroke.brush === "eraser";
  const evenWidth = isMarker || isEraser;
  const outline = getStroke(stroke.points, {
    size: stroke.size,
    thinning: evenWidth ? 0 : 0.5,
    smoothing: evenWidth ? 0.6 : 0.5,
    streamline: evenWidth ? 0.6 : 0.5,
    simulatePressure: evenWidth ? false : stroke.simulatePressure,
  });

  context.save();
  if (isMarker) context.globalAlpha = 0.85;
  context.fillStyle = isEraser ? PAPER : stroke.color;
  context.fill(new Path2D(strokeToSvgPath(outline)));
  context.restore();
}

/**
 * Guides to draw against, like squared paper held over the work.
 *
 * Drawn on top rather than underneath: a guide beneath the drawing disappears
 * behind the first thing filled in, which is exactly when it was useful.
 *
 * Only ever drawn on screen — {@link renderTile} is what the export uses, and
 * it doesn't take a grid, so nobody else sees the lines (issue #39).
 */
function drawGrid(context: CanvasRenderingContext2D) {
  const step = TILE_SIZE / GRID_CELLS;
  // A mid grey at half strength reads as a faint line on paper and as a pale
  // one over dark ink, so the guide survives whatever is under it.
  const scale = context.getTransform().a || 1;

  context.save();
  context.strokeStyle = "rgba(107, 114, 128, 0.5)";
  // One screen pixel however far in someone has zoomed: a guide that thickens
  // with the drawing starts covering it.
  context.lineWidth = 1 / scale;
  context.beginPath();
  for (let line = 1; line < GRID_CELLS; line++) {
    const offset = line * step;
    context.moveTo(offset, 0);
    context.lineTo(offset, TILE_SIZE);
    context.moveTo(0, offset);
    context.lineTo(TILE_SIZE, offset);
  }
  context.stroke();
  context.restore();
}

/**
 * Paints a whole drawing, in tile coordinates.
 *
 * The caller scales the context first, so this is identical whether it's
 * painting a 1029-pixel canvas on a phone or the 768-pixel export.
 */
export function renderScene(
  context: CanvasRenderingContext2D,
  scene: Scene,
): void {
  // Painted explicitly so the exported PNG isn't transparent.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

  for (const op of scene.ops) {
    if (op.kind === "fill") {
      context.drawImage(op.mask.canvas, op.mask.x, op.mask.y);
    } else {
      drawStroke(context, op);
    }
  }

  if (scene.activeStroke) drawStroke(context, scene.activeStroke);

  // Last, so it stays a guide rather than something to paint over.
  if (scene.showGrid) drawGrid(context);
}

/**
 * Renders the drawing at its true size, with no grid, for upload.
 *
 * Separate from what's on screen so the two can never drift: the canvas the
 * visitor draws on is sized to their display, which is usually larger.
 */
export function renderTile(ops: DrawOp[]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  renderScene(context, { ops, activeStroke: null, showGrid: false });
  return canvas;
}

/**
 * Colours in the area around a point, the way a paint bucket does.
 *
 * Worked out against the whole tile at its own resolution rather than against
 * what happens to be on screen, so a fill made while zoomed in covers exactly
 * what it would have covered zoomed out.
 *
 * @returns The fill, or `null` if there was nothing to colour in.
 */
export function fillAt(
  ops: DrawOp[],
  x: number,
  y: number,
  color: string,
): Fill | null {
  const tile = renderTile(ops);
  const context = tile.getContext("2d");
  if (!context) return null;

  const region = floodFill(
    context.getImageData(0, 0, TILE_SIZE, TILE_SIZE),
    x,
    y,
  );
  if (!region) return null;

  const mask = document.createElement("canvas");
  mask.width = region.width;
  mask.height = region.height;

  const maskContext = mask.getContext("2d");
  if (!maskContext) return null;

  const image = maskContext.createImageData(region.width, region.height);
  const [red, green, blue] = toRgb(color);

  for (let index = 0; index < region.pixels.length; index++) {
    if (!region.pixels[index]) continue;
    const offset = index * 4;
    image.data[offset] = red;
    image.data[offset + 1] = green;
    image.data[offset + 2] = blue;
    image.data[offset + 3] = 255;
  }

  maskContext.putImageData(image, 0, 0);
  return {
    kind: "fill",
    color,
    mask: { canvas: mask, x: region.x, y: region.y },
  };
}

/** `#rrggbb` to its three parts. */
function toRgb(color: string): [number, number, number] {
  const value = Number.parseInt(color.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * The backing-store size for a canvas shown at `cssWidth`.
 *
 * A canvas is stretched to whatever CSS size it's given, so one sized in tile
 * units is upscaled on any dense screen — on a phone that's every stroke
 * edge blurred by about a third. Matching the device's pixels fixes it.
 *
 * Capped at 3× so a very dense display doesn't allocate an enormous buffer
 * for a drawing that is 768 pixels in the end anyway.
 */
export function backingSizeFor(cssWidth: number, pixelRatio: number): number {
  const ratio = Math.min(Math.max(pixelRatio, 1), 3);
  return Math.max(Math.round(cssWidth * ratio), TILE_SIZE);
}

/** How far in someone can zoom while drawing. */
export const MAX_ZOOM = 8;

/**
 * Which part of the tile is on screen.
 *
 * The drawing itself never changes when this does — only the window onto it —
 * so a tile drawn zoomed in is the same picture as one drawn zoomed out.
 */
export type View = {
  /** 1 shows the whole tile; 8 shows an eighth of it across. */
  scale: number;
  /** Tile coordinates of the top-left corner on screen. */
  offsetX: number;
  offsetY: number;
};

export const WHOLE_TILE: View = { scale: 1, offsetX: 0, offsetY: 0 };

/**
 * Keeps a view over the tile: never further out than the whole thing, never
 * so far in that the drawing leaves the screen.
 */
export function clampView(view: View): View {
  const scale = Math.min(Math.max(view.scale, 1), MAX_ZOOM);
  const visible = TILE_SIZE / scale;
  const furthest = TILE_SIZE - visible;

  return {
    scale,
    offsetX: Math.min(Math.max(view.offsetX, 0), furthest),
    offsetY: Math.min(Math.max(view.offsetY, 0), furthest),
  };
}

/**
 * The point on the tile under a position on screen.
 *
 * @param cssX - Position within the canvas element, in CSS pixels.
 * @param cssSize - The canvas element's width in CSS pixels; it's square.
 */
export function screenToTile(
  view: View,
  cssX: number,
  cssY: number,
  cssSize: number,
): [number, number] {
  const visible = TILE_SIZE / view.scale;
  return [
    view.offsetX + (cssX / cssSize) * visible,
    view.offsetY + (cssY / cssSize) * visible,
  ];
}

/**
 * Zooms to `scale` while holding one point still under the fingers.
 *
 * Anchoring is what makes a pinch feel attached to the drawing rather than to
 * the screen: the spot between someone's fingers is the spot that stays put.
 */
export function zoomAround(
  view: View,
  scale: number,
  anchorCssX: number,
  anchorCssY: number,
  cssSize: number,
): View {
  const [tileX, tileY] = screenToTile(view, anchorCssX, anchorCssY, cssSize);
  const clamped = Math.min(Math.max(scale, 1), MAX_ZOOM);
  const visible = TILE_SIZE / clamped;

  return clampView({
    scale: clamped,
    offsetX: tileX - (anchorCssX / cssSize) * visible,
    offsetY: tileY - (anchorCssY / cssSize) * visible,
  });
}
