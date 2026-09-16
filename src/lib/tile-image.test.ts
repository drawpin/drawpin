// @vitest-environment node
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  BlankTileImageError,
  InvalidTileImageError,
  MAX_UPLOAD_BYTES,
  processTileImage,
  TILE_SIZE,
} from "./tile-image";

/** A PNG with a black diagonal stroke, like a quick scribble. */
async function drawing(options: { size?: number; transparent?: boolean } = {}) {
  const size = options.size ?? 512;
  const background = options.transparent ? "none" : "white";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="100%" height="100%" fill="${background}"/>
    <path d="M20 20 L${size - 20} ${size - 20}" stroke="black" stroke-width="24"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function blank(color = "#ffffff", format: "png" | "jpeg" = "png") {
  return sharp({
    create: { width: 512, height: 512, channels: 3, background: color },
  })
    .toFormat(format)
    .toBuffer();
}

describe("processTileImage", () => {
  it("outputs a square WebP at the tile size", async () => {
    const output = await processTileImage(await drawing({ size: 1024 }));
    const meta = await sharp(output).metadata();

    expect(meta.format).toBe("webp");
    expect([meta.width, meta.height]).toEqual([TILE_SIZE, TILE_SIZE]);
  });

  it("puts transparent drawings on white", async () => {
    const output = await processTileImage(await drawing({ transparent: true }));
    const { data } = await sharp(output)
      .extract({ left: TILE_SIZE - 10, top: 5, width: 1, height: 1 })
      .raw()
      .toBuffer({ resolveWithObject: true });

    expect([...data.subarray(0, 3)].every((value) => value > 245)).toBe(true);
    expect((await sharp(output).metadata()).hasAlpha).toBe(false);
  });

  it.each([
    ["white", "#ffffff"],
    ["any flat colour", "#3366cc"],
  ])("rejects a blank %s canvas", async (_label, color) => {
    await expect(processTileImage(await blank(color))).rejects.toBeInstanceOf(
      BlankTileImageError,
    );
  });

  it("accepts JPEG and WebP input too", async () => {
    const scribble = await drawing();
    for (const format of ["jpeg", "webp"] as const) {
      const input = await sharp(scribble).toFormat(format).toBuffer();
      await expect(processTileImage(input)).resolves.toBeInstanceOf(Buffer);
    }
  });

  it.each([
    ["random bytes", Buffer.from("definitely not an image")],
    ["an empty upload", Buffer.alloc(0)],
    ["an oversized upload", Buffer.alloc(MAX_UPLOAD_BYTES + 1)],
    [
      "an SVG, which could embed external references",
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
      ),
    ],
  ])("rejects %s", async (_label, input) => {
    await expect(processTileImage(input)).rejects.toBeInstanceOf(
      InvalidTileImageError,
    );
  });
});
