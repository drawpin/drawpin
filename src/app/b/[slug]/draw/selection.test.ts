// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  angleFrom,
  centerOf,
  contains,
  grabAt,
  moveBy,
  type Rect,
  resizeFromCorner,
  rotateKnob,
  rotatePoint,
  sameRect,
  selectionBounds,
  snapAngle,
  toLocal,
  whiteToAlpha,
} from "./selection";
import type { Point } from "./shapes";

describe("selectionBounds", () => {
  it("boxes a loop in whole pixels", () => {
    expect(
      selectionBounds(
        [
          [10.4, 20.6],
          [110.2, 25],
          [60, 140.1],
        ],
        768,
      ),
    ).toEqual({ x: 10, y: 20, width: 101, height: 121 });
  });

  it("keeps the box on the tile when the loop runs off the edge", () => {
    expect(
      selectionBounds(
        [
          [-40, -40],
          [100, 0],
          [60, 100],
        ],
        768,
      ),
    ).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it("ignores a tap or a loop too thin to hold anything", () => {
    expect(selectionBounds([[5, 5]], 768)).toBeNull();
    expect(
      selectionBounds(
        [
          [0, 100],
          [300, 102],
          [150, 101],
        ],
        768,
      ),
    ).toBeNull();
  });
});

describe("whiteToAlpha", () => {
  function pixel(r: number, g: number, b: number, a = 255) {
    const data = new Uint8ClampedArray([r, g, b, a]);
    whiteToAlpha(data);
    return [...data];
  }

  it("makes white paper see-through", () => {
    expect(pixel(255, 255, 255)[3]).toBe(0);
  });

  it("keeps black ink as it is", () => {
    expect(pixel(17, 24, 39)).toEqual([17, 24, 39, 255]);
  });

  it("keeps a colour that colour, rather than paler or darker", () => {
    // Pure red is fully inked, so nothing changes.
    expect(pixel(239, 68, 68)).toEqual([239, 68, 68, 255]);
  });

  it("keeps a pale colour drawn on purpose solid", () => {
    expect(pixel(254, 240, 138)).toEqual([254, 240, 138, 255]);
  });

  it("keeps a stroke's grey edge as ink", () => {
    expect(pixel(128, 128, 128)).toEqual([128, 128, 128, 255]);
  });

  it("fades the faintest edge instead of leaving a white rim", () => {
    const [r, g, b, a] = pixel(235, 235, 235);
    // The colour is kept; only how solid it is changes.
    expect([r, g, b]).toEqual([235, 235, 235]);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(255);
  });

  it("leaves pixels outside the loop alone", () => {
    expect(pixel(255, 255, 255, 0)).toEqual([255, 255, 255, 0]);
  });
});

/** Compares points with a little room for floating-point noise. */
function expectPoint(actual: Point, expected: Point) {
  expect(actual[0]).toBeCloseTo(expected[0], 6);
  expect(actual[1]).toBeCloseTo(expected[1], 6);
}

const QUARTER = Math.PI / 2;
const DEGREE = Math.PI / 180;

describe("grabAt", () => {
  const box: Rect = { x: 100, y: 100, width: 200, height: 100 };
  const corner = (index: number) => ({ kind: "corner", corner: index });

  it("finds the corner under a finger", () => {
    expect(grabAt(box, 0, [103, 98], 10, 30)).toEqual(corner(0));
    expect(grabAt(box, 0, [300, 100], 10, 30)).toEqual(corner(1));
    expect(grabAt(box, 0, [296, 204], 10, 30)).toEqual(corner(2));
    expect(grabAt(box, 0, [100, 200], 10, 30)).toEqual(corner(3));
  });

  it("moves the box from anywhere inside it", () => {
    expect(grabAt(box, 0, [200, 150], 10, 30)).toEqual({ kind: "move" });
  });

  it("grabs nothing outside the box and its handles", () => {
    expect(grabAt(box, 0, [400, 150], 10, 30)).toBeNull();
  });

  it("finds the rotate knob above the middle of the top edge", () => {
    expect(grabAt(box, 0, [202, 72], 10, 30)).toEqual({ kind: "rotate" });
  });

  it("follows the box round when it's turned", () => {
    // Turned a quarter clockwise about (200, 150): the 200×100 box now
    // stands 100 wide and 200 tall, and the knob points right.
    expect(grabAt(box, QUARTER, [280, 150], 10, 30)).toEqual({
      kind: "rotate",
    });
    // The old top-left corner is now at the top right.
    expect(grabAt(box, QUARTER, [250, 50], 10, 30)).toEqual(corner(0));
    // Inside the turned box, though outside where it was square…
    expect(grabAt(box, QUARTER, [200, 230], 10, 30)).toEqual({
      kind: "move",
    });
    // …and outside it, though inside where it was square.
    expect(grabAt(box, QUARTER, [290, 150], 5, 30)).toBeNull();
  });

  it("gives the nearest handle when their reaches overlap", () => {
    const small: Rect = { x: 100, y: 100, width: 20, height: 20 };
    // Within reach of the top-left corner and the knob, nearer the knob.
    expect(grabAt(small, 0, [108, 88], 20, 15)).toEqual({ kind: "rotate" });
    expect(grabAt(small, 0, [101, 99], 20, 15)).toEqual(corner(0));
  });
});

describe("rotatePoint / toLocal", () => {
  it("turns clockwise on screen, where y points down", () => {
    expectPoint(rotatePoint([10, 0], [0, 0], QUARTER), [0, 10]);
  });

  it("leaves a point alone at no angle", () => {
    expect(rotatePoint([3, 4], [0, 0], 0)).toEqual([3, 4]);
  });

  it("undoes the box's turn", () => {
    const box: Rect = { x: 0, y: 0, width: 100, height: 50 };
    const turned = rotatePoint([90, 10], centerOf(box), 0.7);
    expectPoint(toLocal(turned, box, 0.7), [90, 10]);
  });
});

describe("rotateKnob", () => {
  const box: Rect = { x: 0, y: 0, width: 100, height: 50 };

  it("sits above the middle of the top edge", () => {
    expect(rotateKnob(box, 0, 20)).toEqual([50, -20]);
  });

  it("turns with the box", () => {
    // Half a turn: below the middle of the (old) bottom edge.
    expectPoint(rotateKnob(box, Math.PI, 20), [50, 70]);
  });
});

describe("angleFrom", () => {
  it("measures the direction from the centre", () => {
    expect(angleFrom([0, 0], [0, 10])).toBeCloseTo(QUARTER, 9);
  });
});

describe("snapAngle", () => {
  it("pulls a near-square turn square", () => {
    expect(snapAngle(QUARTER + 3 * DEGREE, false)).toBeCloseTo(QUARTER, 9);
    expect(snapAngle(-2 * DEGREE, false)).toBe(0);
  });

  it("leaves a turn alone away from square", () => {
    expect(snapAngle(20 * DEGREE, false)).toBeCloseTo(20 * DEGREE, 9);
    expect(snapAngle(QUARTER + 6 * DEGREE, false)).toBeCloseTo(
      QUARTER + 6 * DEGREE,
      9,
    );
  });

  it("steps by 15° with Shift", () => {
    expect(snapAngle(22 * DEGREE, true)).toBeCloseTo(15 * DEGREE, 9);
    expect(snapAngle(23 * DEGREE, true)).toBeCloseTo(30 * DEGREE, 9);
  });

  it("keeps the angle between -π and π", () => {
    expect(snapAngle(2 * Math.PI + 20 * DEGREE, false)).toBeCloseTo(
      20 * DEGREE,
      9,
    );
    expect(snapAngle(-Math.PI - QUARTER, false)).toBeCloseTo(QUARTER, 9);
    // Upside down is one value, not two.
    expect(snapAngle(Math.PI, false)).toBeCloseTo(-Math.PI, 9);
    expect(snapAngle(-Math.PI, false)).toBeCloseTo(-Math.PI, 9);
  });

  it("never gives -0, which would look like a turn", () => {
    expect(Object.is(snapAngle(-0.01 * DEGREE, false), 0)).toBe(true);
    expect(Object.is(snapAngle(-1 * DEGREE, true), 0)).toBe(true);
  });
});

describe("contains", () => {
  const box: Rect = { x: 10, y: 10, width: 50, height: 50 };

  it("says whether a point is inside the selection", () => {
    expect(contains(box, [30, 30])).toBe(true);
    expect(contains(box, [70, 30])).toBe(false);
  });
});

describe("resizeFromCorner", () => {
  const box: Rect = { x: 100, y: 100, width: 200, height: 100 };

  it("grows from the dragged corner, keeping the opposite one still", () => {
    // Bottom right dragged out: top left stays at (100, 100).
    expect(resizeFromCorner(box, 2, [500, 300])).toEqual({
      x: 100,
      y: 100,
      width: 400,
      height: 200,
    });
  });

  it("keeps the proportions whichever way the finger goes", () => {
    const resized = resizeFromCorner(box, 2, [340, 400]);
    expect(resized.width / resized.height).toBeCloseTo(2, 6);
  });

  it("grows up and left from the top-left corner", () => {
    const resized = resizeFromCorner(box, 0, [0, 50]);
    // The bottom-right corner stays where it was.
    expect(resized.x + resized.width).toBe(300);
    expect(resized.y + resized.height).toBe(200);
    expect(resized.width).toBe(300);
  });

  it("can't be dragged inside out or down to nothing", () => {
    const resized = resizeFromCorner(box, 2, [0, 0]);
    expect(resized.x).toBe(100);
    expect(Math.min(resized.width, resized.height)).toBeCloseTo(8, 6);
  });

  describe("on a turned box", () => {
    const angle = 0.6;
    /** Where a corner of `rect` is on the tile, with the box turned. */
    const cornerOnTile = (rect: Rect, local: Point) =>
      rotatePoint(local, centerOf(rect), angle);

    it("keeps the opposite corner where it is on the tile", () => {
      const anchorBefore = cornerOnTile(box, [100, 100]);
      // Drag the bottom-right corner out along the box's own diagonal.
      const pointer = cornerOnTile(box, [500, 300]);
      const resized = resizeFromCorner(box, 2, pointer, angle);

      expect(resized.width).toBeCloseTo(400, 6);
      expect(resized.height).toBeCloseTo(200, 6);
      expectPoint(cornerOnTile(resized, [resized.x, resized.y]), anchorBefore);
    });

    it("puts the dragged corner under the finger", () => {
      const pointer = cornerOnTile(box, [400, 250]);
      const resized = resizeFromCorner(box, 2, pointer, angle);
      expectPoint(
        cornerOnTile(resized, [
          resized.x + resized.width,
          resized.y + resized.height,
        ]),
        pointer,
      );
    });

    it("reads the drag along the box's sides, not the tile's", () => {
      // Straight right on the tile is partly down the box's side once it's
      // turned a quarter, so the box doesn't grow from the bottom-right.
      const quarter = resizeFromCorner(box, 2, [400, 250], QUARTER);
      const square = resizeFromCorner(box, 2, [400, 250]);
      expect(quarter.width).not.toBeCloseTo(square.width, 1);
    });

    it("matches the square resize when there's no turn", () => {
      expect(resizeFromCorner(box, 0, [0, 50], 0)).toEqual(
        resizeFromCorner(box, 0, [0, 50]),
      );
    });
  });
});

describe("moveBy / sameRect", () => {
  it("moves a box without resizing it", () => {
    const box: Rect = { x: 10, y: 20, width: 30, height: 40 };
    expect(moveBy(box, 5, -5)).toEqual({ x: 15, y: 15, width: 30, height: 40 });
  });

  it("tells an untouched selection from a moved one", () => {
    const box: Rect = { x: 10, y: 20, width: 30, height: 40 };
    expect(sameRect(box, { ...box })).toBe(true);
    expect(sameRect(box, moveBy(box, 1, 0))).toBe(false);
  });
});
