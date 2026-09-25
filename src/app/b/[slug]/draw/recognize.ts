import { type Point, type ShapeGeometry, shapeEnd } from "./shapes";

/*
 * The snap assist: working out which shape a freehand stroke was trying to be.
 *
 * Every threshold here is a fraction of the stroke's own size, so a small
 * circle and a large one are judged the same way, and the same drawing gives
 * the same answer at any zoom. Each errs towards "no shape": a stroke left as
 * drawn is only a missed convenience, while one that snaps to the wrong thing
 * has to be undone and drawn again.
 */

/** Shorter than this, in tile units, a stroke is a mark rather than a shape. */
const MIN_LENGTH = 24;

/** A stroke that ends this close to its start, relative to its size, is closed. */
const CLOSED_GAP = 0.2;

/** A line may stray this far from straight, relative to its length. */
const LINE_WOBBLE = 0.06;

/** A line that doubles back on itself isn't a line, even if it's straight. */
const LINE_DETOUR = 1.15;

/** How closely a closed shape has to fit, on average, relative to its size. */
const FIT_TOLERANCE = 0.05;

/** How much wobble is ignored when finding corners, relative to size. */
const CORNER_EPSILON = 0.07;

/** A bend gentler than this, in degrees, is part of an edge, not a corner. */
const FLAT_ANGLE = 150;

/** Within this many degrees of level or upright, straighten it the rest of the way. */
const AXIS_SNAP = 8;

/** Radii this close to each other make a circle rather than an oval. */
const ROUND_RATIO = 0.88;

/** Sides this close to each other make a square rather than a rectangle. */
const SQUARE_RATIO = 0.9;

const DEGREE = Math.PI / 180;

/**
 * The shape a freehand stroke was trying to be, or `null` if it doesn't look
 * enough like any of them: a line when it's open and straight, and an oval, a
 * rectangle or square, a triangle or a four-sided shape when it's closed.
 */
export function recognizeShape(
  stroke: [number, number, number][],
): ShapeGeometry | null {
  const points: Point[] = stroke.map(([x, y]) => [x, y]);
  if (points.length < 5) return null;

  const length = pathLength(points);
  if (length < MIN_LENGTH) return null;

  const box = boundsOf(points);
  const size = Math.hypot(box.width, box.height);
  const gap = distance(points[0], points[points.length - 1]);

  return gap > CLOSED_GAP * size
    ? straightLine(points, length)
    : closedShape(points, size);
}

function straightLine(points: Point[], length: number): ShapeGeometry | null {
  const from = points[0];
  const to = points[points.length - 1];
  const span = distance(from, to);

  if (length > span * LINE_DETOUR) return null;
  for (const point of points) {
    if (distanceToSegment(point, from, to) > span * LINE_WOBBLE) return null;
  }

  // Nearly level, upright or diagonal is taken to mean exactly that.
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const eighth = Math.PI / 4;
  const offBy = Math.abs(angle - Math.round(angle / eighth) * eighth);
  return {
    shape: "line",
    from,
    to: offBy < AXIS_SNAP * DEGREE ? shapeEnd("line", from, to, true) : to,
  };
}

function closedShape(points: Point[], size: number): ShapeGeometry | null {
  const corners = cornersOf(points, size);
  const candidates: { geometry: ShapeGeometry; error: number }[] = [];

  if (corners.length === 3 || corners.length === 4) {
    candidates.push({
      geometry: polygonShape(corners),
      error: meanDistanceToPolygon(points, corners) / size,
    });
  }

  const ellipse = fitEllipse(points);
  if (ellipse) {
    candidates.push({
      geometry: ellipseShape(ellipse),
      error: ellipse.error / size,
    });
  }

  const best = candidates
    .filter((candidate) => candidate.error <= FIT_TOLERANCE)
    .sort((a, b) => a.error - b.error)[0];
  return best?.geometry ?? null;
}

/**
 * Three corners stay a triangle as drawn. Four become a rectangle — a square
 * if the sides are nearly equal — when every edge is nearly level or upright,
 * and otherwise stay where they were drawn with the edges made straight.
 */
function polygonShape(corners: Point[]): ShapeGeometry {
  if (corners.length === 4 && corners.every(edgeIsAxisAligned(corners))) {
    const box = boundsOf(corners);
    const shorter = Math.min(box.width, box.height);
    const longer = Math.max(box.width, box.height);
    const [width, height] =
      shorter / longer >= SQUARE_RATIO
        ? [(box.width + box.height) / 2, (box.width + box.height) / 2]
        : [box.width, box.height];
    return {
      shape: "rectangle",
      from: [box.x, box.y],
      to: [box.x + width, box.y + height],
    };
  }
  return { shape: "polygon", points: corners };
}

function edgeIsAxisAligned(corners: Point[]) {
  return (corner: Point, index: number) => {
    const next = corners[(index + 1) % corners.length];
    const angle = Math.atan2(next[1] - corner[1], next[0] - corner[0]);
    const quarter = Math.PI / 2;
    return (
      Math.abs(angle - Math.round(angle / quarter) * quarter) <
      AXIS_SNAP * DEGREE
    );
  };
}

function ellipseShape(fit: EllipseFit): ShapeGeometry {
  let { radiusX, radiusY, rotation } = fit;
  const [cx, cy] = fit.center;

  if (Math.min(radiusX, radiusY) / Math.max(radiusX, radiusY) >= ROUND_RATIO) {
    // A circle has no angle to keep.
    radiusX = radiusY = (radiusX + radiusY) / 2;
    rotation = 0;
  } else {
    const quarter = Math.PI / 2;
    const turns = Math.round(rotation / quarter);
    if (Math.abs(rotation - turns * quarter) < AXIS_SNAP * DEGREE) {
      // Nearly level or upright: straighten it, swapping the radii if it was
      // fitted a quarter turn round.
      if (Math.abs(turns) % 2 === 1) [radiusX, radiusY] = [radiusY, radiusX];
      rotation = 0;
    }
  }

  return {
    shape: "ellipse",
    from: [cx - radiusX, cy - radiusY],
    to: [cx + radiusX, cy + radiusY],
    rotation,
  };
}

type EllipseFit = {
  center: Point;
  radiusX: number;
  radiusY: number;
  rotation: number;
  /** Average distance of the stroke from the fitted oval, in tile units. */
  error: number;
};

/**
 * The oval a closed stroke is closest to.
 *
 * The centre is the stroke's average point; its tilt is the direction the
 * points spread furthest in; and each radius comes from how far the points
 * spread along that axis — for points around an oval, the average squared
 * distance along an axis is half the radius squared.
 */
function fitEllipse(points: Point[]): EllipseFit | null {
  const count = points.length;
  const cx = points.reduce((sum, [x]) => sum + x, 0) / count;
  const cy = points.reduce((sum, [, y]) => sum + y, 0) / count;

  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (const [x, y] of points) {
    xx += (x - cx) ** 2;
    yy += (y - cy) ** 2;
    xy += (x - cx) * (y - cy);
  }
  const rotation = Math.atan2(2 * xy, xx - yy) / 2;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const along = points.map(([x, y]): Point => [
    (x - cx) * cos + (y - cy) * sin,
    -(x - cx) * sin + (y - cy) * cos,
  ]);
  const radiusX = Math.sqrt(
    (2 * along.reduce((sum, [u]) => sum + u * u, 0)) / count,
  );
  const radiusY = Math.sqrt(
    (2 * along.reduce((sum, [, v]) => sum + v * v, 0)) / count,
  );
  if (radiusX === 0 || radiusY === 0) return null;

  // How far each point is from the oval, measured as how far off 1 its
  // scaled distance from the centre is, in units of the average radius.
  const meanRadius = (radiusX + radiusY) / 2;
  const error =
    along.reduce(
      (sum, [u, v]) =>
        sum + Math.abs(Math.hypot(u / radiusX, v / radiusY) - 1) * meanRadius,
      0,
    ) / count;

  return { center: [cx, cy], radiusX, radiusY, rotation, error };
}

/**
 * The corners of a closed stroke: the path simplified until only bends bigger
 * than the drawing's wobble are left, then with any bend that's nearly
 * straight dropped — including the one where the stroke happened to start,
 * which is usually partway along an edge.
 */
function cornersOf(points: Point[], size: number): Point[] {
  const epsilon = CORNER_EPSILON * size;
  const corners = simplify(points, epsilon);

  // The stroke ends where it started; one copy of that point is enough.
  if (corners.length > 1 && distance(corners[0], corners.at(-1)!) < epsilon) {
    corners.pop();
  }

  let changed = true;
  while (changed && corners.length > 3) {
    changed = false;
    for (let index = 0; index < corners.length; index++) {
      const previous = corners[(index - 1 + corners.length) % corners.length];
      const next = corners[(index + 1) % corners.length];
      if (angleAt(previous, corners[index], next) > FLAT_ANGLE) {
        corners.splice(index, 1);
        changed = true;
        break;
      }
    }
  }
  return corners;
}

/** Ramer–Douglas–Peucker: the fewest points that stay within `epsilon` of the path. */
function simplify(points: Point[], epsilon: number): Point[] {
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let farthest = -1;
    let farthestDistance = epsilon;
    for (let index = start + 1; index < end; index++) {
      const away = distanceToSegment(points[index], points[start], points[end]);
      if (away > farthestDistance) {
        farthest = index;
        farthestDistance = away;
      }
    }
    if (farthest !== -1) {
      keep[farthest] = true;
      stack.push([start, farthest], [farthest, end]);
    }
  }
  return points.filter((_, index) => keep[index]);
}

/** The angle at `corner` between the edges to its neighbours, in degrees. */
function angleAt(previous: Point, corner: Point, next: Point): number {
  const a = Math.atan2(previous[1] - corner[1], previous[0] - corner[0]);
  const b = Math.atan2(next[1] - corner[1], next[0] - corner[0]);
  let between = Math.abs(a - b) / DEGREE;
  if (between > 180) between = 360 - between;
  return between;
}

function meanDistanceToPolygon(points: Point[], corners: Point[]): number {
  let total = 0;
  for (const point of points) {
    let nearest = Infinity;
    for (let index = 0; index < corners.length; index++) {
      const next = corners[(index + 1) % corners.length];
      nearest = Math.min(
        nearest,
        distanceToSegment(point, corners[index], next),
      );
    }
    total += nearest;
  }
  return total / points.length;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function distanceToSegment(point: Point, from: Point, to: Point): number {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(point, from);

  const along = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - from[0]) * dx + (point[1] - from[1]) * dy) / lengthSquared,
    ),
  );
  return distance(point, [from[0] + along * dx, from[1] + along * dy]);
}

function pathLength(points: Point[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index++) {
    total += distance(points[index - 1], points[index]);
  }
  return total;
}

function boundsOf(points: Point[]) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
