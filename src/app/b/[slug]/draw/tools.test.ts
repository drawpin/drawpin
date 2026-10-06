// @vitest-environment node
import { describe, expect, it } from "vitest";
import { markFor, toolName } from "./tools";

describe("toolName", () => {
  it.each([
    ["pen", "Pen"],
    ["eraser", "Eraser"],
    ["ellipse", "Circle"],
    ["fill", "Fill"],
    ["lasso", "Lasso"],
  ] as const)("calls %s %s", (tool, name) => {
    expect(toolName(tool)).toBe(name);
  });
});

describe("markFor", () => {
  it.each(["pen", "marker", "spray", "eraser"] as const)(
    "rings %s at its size",
    (tool) => {
      expect(markFor(tool)).toBe("ring");
    },
  );

  it.each(["fill", "lasso", "line", "rectangle", "ellipse"] as const)(
    "gives %s a crosshair",
    (tool) => {
      expect(markFor(tool)).toBe("cross");
    },
  );
});
