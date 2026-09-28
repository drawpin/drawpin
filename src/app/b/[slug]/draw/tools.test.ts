// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cursorFor, toolName } from "./tools";

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

describe("cursorFor", () => {
  it("hides the cursor for the eraser, which draws its own outline", () => {
    expect(cursorFor("eraser")).toBe("none");
  });

  it("gives the drawing tools a crosshair", () => {
    expect(cursorFor("pen")).toBe("crosshair");
    expect(cursorFor("rectangle")).toBe("crosshair");
  });
});
