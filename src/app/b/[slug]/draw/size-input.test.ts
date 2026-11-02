import { describe, expect, it } from "vitest";
import { parseSizeInput } from "./size-input";

describe("parseSizeInput", () => {
  it("accepts a size inside the range", () => {
    expect(parseSizeInput("20", 4, 64)).toBe(20);
    expect(parseSizeInput(" 20 ", 4, 64)).toBe(20);
  });

  it("clamps to the range", () => {
    expect(parseSizeInput("1", 4, 64)).toBe(4);
    expect(parseSizeInput("0", 4, 64)).toBe(4);
    expect(parseSizeInput("500", 4, 64)).toBe(64);
  });

  it("waits while the text is empty or not a whole number", () => {
    expect(parseSizeInput("", 4, 64)).toBeNull();
    expect(parseSizeInput("  ", 4, 64)).toBeNull();
    expect(parseSizeInput("-", 4, 64)).toBeNull();
    expect(parseSizeInput("-5", 4, 64)).toBeNull();
    expect(parseSizeInput("1.5", 4, 64)).toBeNull();
    expect(parseSizeInput("abc", 4, 64)).toBeNull();
  });

  it("snaps to the step, counted from the minimum", () => {
    expect(parseSizeInput("11", 4, 64, 5)).toBe(9);
    expect(parseSizeInput("12", 4, 64, 5)).toBe(14);
    expect(parseSizeInput("64", 4, 64, 5)).toBe(64);
  });
});
