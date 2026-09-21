// @vitest-environment node
import { describe, expect, it } from "vitest";
import { backingSizeFor, TILE_SIZE } from "./render";

describe("backingSizeFor", () => {
  it("matches the device's pixels on a phone", () => {
    // An iPhone at 390px wide shows the canvas at 343 CSS px on a 3× screen.
    expect(backingSizeFor(343, 3)).toBe(1029);
  });

  it("never goes below tile size, however small the canvas is drawn", () => {
    // The export is 768 either way, so a smaller buffer would only throw
    // away detail the visitor drew.
    expect(backingSizeFor(200, 1)).toBe(TILE_SIZE);
    expect(backingSizeFor(343, 1)).toBe(TILE_SIZE);
  });

  it("caps the density, so a 4× display doesn't allocate absurdly", () => {
    expect(backingSizeFor(500, 4)).toBe(backingSizeFor(500, 3));
  });

  it("treats a missing or nonsense ratio as 1×", () => {
    expect(backingSizeFor(1000, 0)).toBe(1000);
    expect(backingSizeFor(1000, 0.5)).toBe(1000);
  });

  it("rounds to whole pixels", () => {
    expect(Number.isInteger(backingSizeFor(343.7, 2.625))).toBe(true);
  });
});
