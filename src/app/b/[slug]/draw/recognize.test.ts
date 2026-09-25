// @vitest-environment node
import { describe, expect, it } from "vitest";
import { recognizeShape } from "./recognize";
import type { Point, ShapeGeometry } from "./shapes";

type StrokePoint = [number, number, number];

/** The same wobble every run, so a threshold change shows up as a failure. */
function wobble(seed: number) {
  let state = seed;
  return (amount: number) => {
    state = (state * 16807) % 2147483647;
    return ((state / 2147483647) * 2 - 1) * amount;
  };
}

/** A hand-drawn straight line, a little unsteady. */
function lineStroke(from: Point, to: Point, jitter = 1.5): StrokePoint[] {
  const shake = wobble(7);
  return Array.from({ length: 40 }, (_, index) => {
    const t = index / 39;
    return [
      from[0] + (to[0] - from[0]) * t + shake(jitter),
      from[1] + (to[1] - from[1]) * t + shake(jitter),
      0.5,
    ];
  });
}

/**
 * A hand-drawn closed polygon, started partway along its first edge — people
 * rarely begin exactly on a corner — and ending back where it began.
 */
function polygonStroke(corners: Point[], jitter = 1.5): StrokePoint[] {
  const shake = wobble(11);
  const ring = [...corners, corners[0]];
  const path: StrokePoint[] = [];
  const start = 0.4;

  const edge = (from: Point, to: Point, t0: number, t1: number) => {
    for (let step = 0; step <= 20; step++) {
      const t = t0 + ((t1 - t0) * step) / 20;
      path.push([
        from[0] + (to[0] - from[0]) * t + shake(jitter),
        from[1] + (to[1] - from[1]) * t + shake(jitter),
        0.5,
      ]);
    }
  };

  edge(ring[0], ring[1], start, 1);
  for (let index = 1; index < corners.length; index++) {
    edge(ring[index], ring[index + 1], 0, 1);
  }
  edge(ring[0], ring[1], 0, start);
  return path;
}

/** A hand-drawn oval, all the way round and a touch past where it started. */
function ellipseStroke(
  center: Point,
  radiusX: number,
  radiusY: number,
  rotation = 0,
  sweep = Math.PI * 2.05,
  jitter = 1.5,
): StrokePoint[] {
  const shake = wobble(13);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return Array.from({ length: 72 }, (_, index) => {
    const t = 0.3 + (sweep * index) / 71;
    const u = radiusX * Math.cos(t);
    const v = radiusY * Math.sin(t);
    return [
      center[0] + u * cos - v * sin + shake(jitter),
      center[1] + u * sin + v * cos + shake(jitter),
      0.5,
    ];
  });
}

function expectShape<K extends ShapeGeometry["shape"]>(
  result: ShapeGeometry | null,
  shape: K,
): Extract<ShapeGeometry, { shape: K }> {
  expect(result?.shape).toBe(shape);
  return result as Extract<ShapeGeometry, { shape: K }>;
}

describe("recognizeShape: lines", () => {
  it("straightens a wobbly line between where it started and ended", () => {
    const line = expectShape(
      recognizeShape(lineStroke([100, 100], [500, 380])),
      "line",
    );
    expect(line.from[0]).toBeCloseTo(100, -1);
    expect(line.to[0]).toBeCloseTo(500, -1);
    expect(line.to[1]).toBeCloseTo(380, -1);
  });

  it("makes a nearly level line exactly level", () => {
    // Three degrees off: close enough to have meant level.
    const rise = Math.tan(3 * (Math.PI / 180)) * 400;
    const line = expectShape(
      recognizeShape(lineStroke([100, 300], [500, 300 + rise], 0.5)),
      "line",
    );
    expect(line.to[1]).toBeCloseTo(line.from[1], 6);
  });

  it("leaves a deliberate angle alone", () => {
    const line = expectShape(
      recognizeShape(lineStroke([100, 100], [500, 330])),
      "line",
    );
    // 30° isn't near level, upright or diagonal, so it isn't moved.
    expect(line.to[1]).toBeCloseTo(330, -1);
  });
});

describe("recognizeShape: closed shapes", () => {
  it("turns a rough square into an exact square", () => {
    const square = expectShape(
      recognizeShape(
        polygonStroke([
          [200, 200],
          [500, 205],
          [498, 505],
          [197, 498],
        ]),
      ),
      "rectangle",
    );
    const width = square.to[0] - square.from[0];
    const height = square.to[1] - square.from[1];
    expect(width).toBeCloseTo(height, 6);
    expect(width).toBeGreaterThan(280);
  });

  it("keeps a long rectangle long", () => {
    const rectangle = expectShape(
      recognizeShape(
        polygonStroke([
          [100, 250],
          [600, 250],
          [600, 450],
          [100, 450],
        ]),
      ),
      "rectangle",
    );
    const width = rectangle.to[0] - rectangle.from[0];
    const height = rectangle.to[1] - rectangle.from[1];
    expect(width / height).toBeGreaterThan(2);
  });

  it("keeps a tilted four-sided shape where it was drawn, edges straightened", () => {
    const angle = 30 * (Math.PI / 180);
    const corners: Point[] = [0, 1, 2, 3].map((quarter) => {
      const a = angle + (quarter * Math.PI) / 2;
      return [384 + 180 * Math.cos(a), 384 + 180 * Math.sin(a)];
    });
    const polygon = expectShape(
      recognizeShape(polygonStroke(corners)),
      "polygon",
    );
    expect(polygon.points).toHaveLength(4);
  });

  it("straightens a triangle's edges", () => {
    const triangle = expectShape(
      recognizeShape(
        polygonStroke([
          [384, 120],
          [620, 560],
          [150, 560],
        ]),
      ),
      "polygon",
    );
    expect(triangle.points).toHaveLength(3);
  });

  it("turns a rough circle into an exact circle", () => {
    const circle = expectShape(
      recognizeShape(ellipseStroke([384, 384], 200, 190)),
      "ellipse",
    );
    const width = circle.to[0] - circle.from[0];
    const height = circle.to[1] - circle.from[1];
    expect(width).toBeCloseTo(height, 6);
    expect(circle.rotation).toBe(0);
  });

  it("keeps an oval's proportions", () => {
    const oval = expectShape(
      recognizeShape(ellipseStroke([384, 384], 260, 120)),
      "ellipse",
    );
    const width = oval.to[0] - oval.from[0];
    const height = oval.to[1] - oval.from[1];
    expect(width / height).toBeGreaterThan(1.8);
    expect(oval.rotation).toBe(0);
  });

  it("keeps a tilted oval at the angle it was drawn", () => {
    const angle = 35 * (Math.PI / 180);
    const oval = expectShape(
      recognizeShape(ellipseStroke([384, 384], 260, 110, angle)),
      "ellipse",
    );
    // An oval at 35° is the same as one at 35° ± 180°.
    const rotation = (((oval.rotation ?? 0) % Math.PI) + Math.PI) % Math.PI;
    expect(rotation).toBeCloseTo(angle, 1);
  });
});

describe("recognizeShape: leaves these alone", () => {
  it("an arc that doesn't close", () => {
    expect(
      recognizeShape(ellipseStroke([384, 384], 200, 200, 0, Math.PI)),
    ).toBeNull();
  });

  it("a bend that isn't a line", () => {
    const corner: StrokePoint[] = [
      ...lineStroke([100, 100], [400, 100]),
      ...lineStroke([400, 100], [400, 500]),
    ];
    expect(recognizeShape(corner)).toBeNull();
  });

  it("a zigzag", () => {
    const shake = wobble(3);
    const zigzag: StrokePoint[] = Array.from({ length: 60 }, (_, index) => [
      100 + index * 8,
      300 + (index % 2 === 0 ? -60 : 60) + shake(2),
      0.5,
    ]);
    expect(recognizeShape(zigzag)).toBeNull();
  });

  it("a scribble that closes on itself", () => {
    const shake = wobble(5);
    const scribble: StrokePoint[] = Array.from({ length: 80 }, (_, index) => {
      const t = (index / 79) * Math.PI * 2;
      // A loop with a lobe: nowhere near an oval or a polygon.
      const radius = 150 + 90 * Math.sin(5 * t) + shake(4);
      return [384 + radius * Math.cos(t), 384 + radius * Math.sin(t), 0.5];
    });
    expect(recognizeShape(scribble)).toBeNull();
  });

  it("a tiny mark", () => {
    expect(recognizeShape(lineStroke([300, 300], [310, 302], 0.2))).toBeNull();
  });

  it("a tap", () => {
    expect(recognizeShape([[300, 300, 0.5]])).toBeNull();
  });
});
