// @vitest-environment node
import { describe, expect, it } from "vitest";
import { boardUrl, createBoardQrCode } from "./board";

describe("boardUrl", () => {
  it("joins the site origin and slug", () => {
    expect(boardUrl("https://drawpin.app", "blue-bottle-k7m2")).toBe(
      "https://drawpin.app/b/blue-bottle-k7m2",
    );
  });

  it("ignores a trailing slash on the site URL", () => {
    expect(boardUrl("http://localhost:3000/", "cafe-aaaa")).toBe(
      "http://localhost:3000/b/cafe-aaaa",
    );
  });
});

describe("createBoardQrCode", () => {
  it("returns an SVG and a PNG data URL", async () => {
    const { svg, pngDataUrl } = await createBoardQrCode(
      "https://drawpin.app/b/blue-bottle-k7m2",
    );

    expect(svg).toMatch(/^<svg[\s\S]*<\/svg>\s*$/);
    expect(pngDataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
