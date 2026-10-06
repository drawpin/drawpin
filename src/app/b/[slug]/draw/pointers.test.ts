// @vitest-environment node
import { describe, expect, it } from "vitest";
import { pointerRole, pressedByLift } from "./pointers";

describe("pointerRole", () => {
  it("ignores a touch while a stylus is drawing, as a resting palm", () => {
    expect(pointerRole({ pointerType: "touch", isPrimary: true }, true)).toBe(
      "ignore",
    );
    expect(pointerRole({ pointerType: "touch", isPrimary: false }, true)).toBe(
      "ignore",
    );
  });

  it("lets a stylus draw even with a palm already down", () => {
    expect(pointerRole({ pointerType: "pen", isPrimary: true }, false)).toBe(
      "stylus",
    );
  });

  it("starts afresh on the first finger of a new touch", () => {
    expect(pointerRole({ pointerType: "touch", isPrimary: true }, false)).toBe(
      "fresh",
    );
  });

  it("adds a second finger, which makes a pinch", () => {
    expect(pointerRole({ pointerType: "touch", isPrimary: false }, false)).toBe(
      "add",
    );
  });

  it("adds a mouse", () => {
    expect(pointerRole({ pointerType: "mouse", isPrimary: true }, false)).toBe(
      "add",
    );
  });
});

describe("pressedByLift", () => {
  const box = { left: 100, top: 200, right: 190, bottom: 244 };
  const lift = (pointerType: string, clientX: number, clientY: number) =>
    pressedByLift({ pointerType, isPrimary: false, clientX, clientY }, box);

  it("counts a finger lifted over the button, even with another one down", () => {
    expect(lift("touch", 150, 220)).toBe(true);
  });

  it("counts a stylus lifted over the button", () => {
    expect(lift("pen", 100, 244)).toBe(true);
  });

  it("doesn't count a finger that slid off before lifting", () => {
    expect(lift("touch", 220, 220)).toBe(false);
    expect(lift("touch", 150, 260)).toBe(false);
  });

  it("leaves a mouse to its click", () => {
    expect(lift("mouse", 150, 220)).toBe(false);
  });
});
