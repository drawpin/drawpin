import { getStroke } from "perfect-freehand";
import { strokeToSvgPath } from "./stroke-path";

/**
 * The drawing's own coordinate system, and the size the finished tile is
 * exported at. Strokes are stored in these units whatever the screen is, so a
 * drawing made on a phone and one made on a laptop are the same picture.
 */
export const TILE_SIZE = 768;

/** Lines in the guide grid, across and down. */
export const GRID_CELLS = 8;

export type Stroke = {
  points: [x: number, y: number, pressure: number][];
  color: string;
  size: number;
  /** Mice and fingers report no real pressure, so it's simulated from speed. */
  simulatePressure: boolean;
};

export type Scene = {
  strokes: Stroke[];
  /** The stroke being drawn right now, if any. */
  activeStroke: Stroke | null;
  /** Drawn under the strokes, and never part of the exported tile. */
  showGrid: boolean;
};

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
  const outline = getStroke(stroke.points, {
    size: stroke.size,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: stroke.simulatePressure,
  });

  context.fillStyle = stroke.color;
  context.fill(new Path2D(strokeToSvgPath(outline)));
}

/**
 * Faint guides to draw against, like squared paper.
 *
 * Only ever drawn on screen: {@link renderTile} is what the export uses, and
 * it doesn't take a grid, so nobody else sees the lines (issue #39).
 */
function drawGrid(context: CanvasRenderingContext2D) {
  const step = TILE_SIZE / GRID_CELLS;

  context.save();
  context.strokeStyle = "#e5e7eb";
  context.lineWidth = 1;
  context.beginPath();
  for (let line = 1; line < GRID_CELLS; line++) {
    const offset = Math.round(line * step) + 0.5;
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

  if (scene.showGrid) drawGrid(context);

  for (const stroke of scene.strokes) drawStroke(context, stroke);
  if (scene.activeStroke) drawStroke(context, scene.activeStroke);
}

/**
 * Renders the drawing at its true size, with no grid, for upload.
 *
 * Separate from what's on screen so the two can never drift: the canvas the
 * visitor draws on is sized to their display, which is usually larger.
 */
export function renderTile(strokes: Stroke[]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  renderScene(context, { strokes, activeStroke: null, showGrid: false });
  return canvas;
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
