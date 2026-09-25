// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  contains,
  handleAt,
  moveBy,
  type Rect,
  resizeFromCorner,
  sameRect,
  selectionBounds,
  whiteToAlpha,
} from "./selection";

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

describe("handleAt", () => {
  const box: Rect = { x: 100, y: 100, width: 200, height: 100 };

  it("finds the corner under a finger", () => {
    expect(handleAt(box, [103, 98], 10)).toBe(0);
    expect(handleAt(box, [300, 100], 10)).toBe(1);
    expect(handleAt(box, [296, 204], 10)).toBe(2);
    expect(handleAt(box, [100, 200], 10)).toBe(3);
  });

  it("finds none in the middle of the box", () => {
    expect(handleAt(box, [200, 150], 10)).toBeNull();
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
