// @vitest-environment node
import { describe, expect, it } from "vitest";
import { boxBetween, isTooSmall, shapeEnd } from "./shapes";

/** Compares points with a little room for floating-point noise. */
function expectPoint(actual: [number, number], expected: [number, number]) {
  expect(actual[0]).toBeCloseTo(expected[0], 6);
  expect(actual[1]).toBeCloseTo(expected[1], 6);
}

describe("shapeEnd", () => {
  it("follows the pointer exactly when nothing is held", () => {
    expect(shapeEnd("rectangle", [10, 10], [70, 30], false)).toEqual([70, 30]);
    expect(shapeEnd("line", [0, 0], [13, 7], false)).toEqual([13, 7]);
  });

  it("turns a rectangle into a square the size of the longer side", () => {
    expect(shapeEnd("rectangle", [10, 10], [70, 30], true)).toEqual([70, 70]);
  });

  it("keeps the square on the side the pointer went", () => {
    expect(shapeEnd("rectangle", [100, 100], [40, 90], true)).toEqual([40, 40]);
  });

  it("turns an oval into a circle", () => {
    expect(shapeEnd("ellipse", [0, 0], [20, 50], true)).toEqual([50, 50]);
  });

  it("doesn't collapse a square dragged straight sideways into a line", () => {
    expect(shapeEnd("rectangle", [0, 0], [30, 0], true)).toEqual([30, 30]);
  });

  it("snaps a nearly flat line to horizontal, keeping its length", () => {
    const end = shapeEnd("line", [0, 0], [100, 8], true);
    expectPoint(end, [Math.hypot(100, 8), 0]);
  });

  it("snaps a nearly upright line to vertical", () => {
    expectPoint(shapeEnd("line", [0, 0], [6, -80], true), [
      0,
      -Math.hypot(6, 80),
    ]);
  });

  it("snaps a rough diagonal to exactly 45°", () => {
    const end = shapeEnd("line", [0, 0], [50, 45], true);
    const length = Math.hypot(50, 45);
    expectPoint(end, [length / Math.SQRT2, length / Math.SQRT2]);
  });
});

describe("isTooSmall", () => {
  it("treats a tap as no shape at all", () => {
    expect(isTooSmall([50, 50], [51, 52])).toBe(true);
  });

  it("keeps a thin shape that is long in one direction", () => {
    // A horizontal line has no height, and is still a line.
    expect(isTooSmall([0, 50], [200, 50])).toBe(false);
  });
});

describe("boxBetween", () => {
  it("gives the same box whichever way it was dragged", () => {
    const box = { x: 10, y: 20, width: 30, height: 40 };
    expect(boxBetween([10, 20], [40, 60])).toEqual(box);
    expect(boxBetween([40, 60], [10, 20])).toEqual(box);
    expect(boxBetween([10, 60], [40, 20])).toEqual(box);
  });
});
