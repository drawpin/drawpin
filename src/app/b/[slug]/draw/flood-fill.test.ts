// @vitest-environment node
import { describe, expect, it } from "vitest";
import { floodFill, type Pixels } from "./flood-fill";

/**
 * Builds an image from rows of characters: `.` is white, `#` is black, and
 * `+` is the half-shade a smoothed stroke leaves at its edge.
 */
function imageFrom(rows: string[]): Pixels {
  const height = rows.length;
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const character = rows[y][x];
      const value = character === "#" ? 0 : character === "+" ? 128 : 255;
      const index = (y * width + x) * 4;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }

  return { data, width, height };
}

/** Whether the region covers a point, in image coordinates. */
function covers(
  region: ReturnType<typeof floodFill>,
  x: number,
  y: number,
): boolean {
  if (!region) return false;
  const localX = x - region.x;
  const localY = y - region.y;
  if (localX < 0 || localY < 0) return false;
  if (localX >= region.width || localY >= region.height) return false;
  return region.pixels[localY * region.width + localX] === 1;
}

describe("floodFill", () => {
  it("fills inside a closed shape and stops at its edge", () => {
    const image = imageFrom([
      "........",
      ".######.",
      ".#....#.",
      ".#....#.",
      ".######.",
      "........",
    ]);

    const region = floodFill(image, 3, 2);

    expect(covers(region, 3, 2)).toBe(true);
    expect(covers(region, 4, 3)).toBe(true);
    // Outside the box stays untouched — that's the whole point of an outline.
    expect(covers(region, 0, 0)).toBe(false);
    expect(covers(region, 7, 5)).toBe(false);
  });

  it("escapes through a gap, because that's what paint does", () => {
    const image = imageFrom([
      "........",
      ".######.",
      ".#....#.",
      ".#......",
      ".######.",
      "........",
    ]);

    const region = floodFill(image, 3, 2);

    // A drawing with a gap in its outline floods the lot. Undo is the answer,
    // not a cleverer algorithm that guesses where the line meant to be.
    expect(covers(region, 0, 0)).toBe(true);
  });

  it("fills the whole tile when there's nothing in the way", () => {
    const region = floodFill(imageFrom(["....", "....", "...."]), 0, 0);

    expect(covers(region, 3, 2)).toBe(true);
  });

  it("reaches into the blend at a stroke edge, but not the stroke", () => {
    const image = imageFrom([
      "########",
      "#++++++#",
      "#+....+#",
      "#++++++#",
      "########",
    ]);

    const region = floodFill(image, 3, 2);

    // The half-shaded pixels are covered, so no pale halo is left between
    // the fill and the line...
    expect(covers(region, 1, 2)).toBe(true);
    // ...but the line itself is left where it was.
    expect(covers(region, 0, 2)).toBe(false);
  });

  it("does not fatten a line when the line is what you fill", () => {
    const image = imageFrom([".....", ".....", "#####", ".....", "....."]);

    const region = floodFill(image, 2, 2);

    // Tapping the bucket on a stroke recolours it. It must not also grow
    // it: the paper either side stays paper.
    expect(covers(region, 2, 2)).toBe(true);
    expect(covers(region, 2, 1)).toBe(false);
    expect(covers(region, 2, 3)).toBe(false);
  });

  it("returns nothing for a tap outside the image", () => {
    const image = imageFrom(["....", "...."]);

    expect(floodFill(image, -1, 0)).toBeNull();
    expect(floodFill(image, 0, 99)).toBeNull();
  });

  it("only covers the area it filled, not the whole image", () => {
    const image = imageFrom([
      "########",
      "#......#",
      "#......#",
      "########",
      "########",
      "########",
    ]);

    const region = floodFill(image, 3, 1)!;

    // The box hugs the filled area (plus the pixel of dilation), so a small
    // fill in the corner of a tile doesn't keep a whole tile-sized mask.
    expect(region.height).toBeLessThan(image.height);
  });

  it("handles a tall thin channel without running out of stack", () => {
    const rows = ["#.#"];
    for (let i = 0; i < 400; i++) rows.push("#.#");
    const region = floodFill(imageFrom(rows), 1, 0);

    expect(covers(region, 1, 400)).toBe(true);
  });
});
