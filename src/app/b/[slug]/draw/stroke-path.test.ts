import { describe, expect, it } from "vitest";
import { strokeToSvgPath } from "./stroke-path";

describe("strokeToSvgPath", () => {
  it("returns an empty path for no points", () => {
    expect(strokeToSvgPath([])).toBe("");
  });

  it("builds a closed quadratic path through the midpoints", () => {
    expect(
      strokeToSvgPath([
        [0, 0],
        [10, 0],
        [10, 10],
      ]),
    ).toBe("M 0 0 Q 0 0 5 0 10 0 10 5 10 10 5 5 Z");
  });
});
