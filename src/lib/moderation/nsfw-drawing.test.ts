// @vitest-environment node
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { classifyDrawing, decideFromPredictions } from "./nsfw-drawing";

describe("decideFromPredictions", () => {
  it("doesn't flag a drawing the model is confident is safe", () => {
    expect(
      decideFromPredictions([
        { className: "Drawing", probability: 0.95 },
        { className: "Neutral", probability: 0.03 },
        { className: "Hentai", probability: 0.01 },
        { className: "Porn", probability: 0.005 },
        { className: "Sexy", probability: 0.005 },
      ]),
    ).toEqual({ flagged: false, label: "Drawing:0.95" });
  });

  it("flags when combined Porn + Hentai clears the threshold", () => {
    expect(
      decideFromPredictions([
        { className: "Porn", probability: 0.6 },
        { className: "Hentai", probability: 0.3 },
        { className: "Neutral", probability: 0.05 },
        { className: "Drawing", probability: 0.03 },
        { className: "Sexy", probability: 0.02 },
      ]),
    ).toEqual({ flagged: true, label: "nudity:0.90" });
  });

  it("doesn't flag on 'Sexy' alone, however confident", () => {
    expect(
      decideFromPredictions([
        { className: "Sexy", probability: 0.99 },
        { className: "Neutral", probability: 0.01 },
        { className: "Drawing", probability: 0 },
        { className: "Hentai", probability: 0 },
        { className: "Porn", probability: 0 },
      ]),
    ).toEqual({ flagged: false, label: "Sexy:0.99" });
  });
});

describe("classifyDrawing", () => {
  it("classifies a plain image without flagging it", async () => {
    const image = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .webp()
      .toBuffer();

    const verdict = await classifyDrawing(image);
    expect(verdict.flagged).toBe(false);
  }, 20_000);

  it("treats an unreadable image as an error, not a crash or a block", async () => {
    const verdict = await classifyDrawing(Buffer.from("not an image"));
    expect(verdict).toEqual({ flagged: false, label: "error" });
  }, 20_000);
});
