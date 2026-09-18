// @vitest-environment node
import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

// Written this way so the escape survives every editor it passes through.
const BACKSLASH_PATH = "/" + String.fromCharCode(92) + "evil.example";

describe("safeNextPath", () => {
  it("keeps a path on this site", () => {
    expect(safeNextPath("/b/cafe-aaaa")).toBe("/b/cafe-aaaa");
    expect(safeNextPath("/b/cafe-aaaa?from=qr")).toBe("/b/cafe-aaaa?from=qr");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    BACKSLASH_PATH,
    "javascript:alert(1)",
    "b/cafe-aaaa",
  ])("refuses %o", (value) => {
    expect(safeNextPath(value)).toBe("/");
  });

  it("falls back when there's nothing to go back to", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("", "/b/cafe-aaaa")).toBe("/b/cafe-aaaa");
  });
});
