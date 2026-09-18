// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { moderateTile, type TileContent } from "./moderate-tile";
import { checkWithOpenAi, ModerationUnavailableError } from "./openai";

const content: TileContent = {
  displayName: "Ahmad",
  caption: "my cat",
  image: Buffer.from("webp-bytes"),
};

const allow = vi.fn<typeof checkWithOpenAi>(async () => ({
  flagged: false,
  categories: [],
}));

describe("moderateTile", () => {
  it("allows a clean post and sends name, caption and image to OpenAI", async () => {
    const check = vi.fn<typeof checkWithOpenAi>(async () => ({
      flagged: false,
      categories: [],
    }));

    await expect(
      moderateTile(content, { apiKey: "sk", blockedTerms: [], check }),
    ).resolves.toEqual({ allowed: true });

    expect(check.mock.calls[0][0]).toEqual({
      text: "Ahmad\nmy cat",
      image: {
        dataUrl: `data:image/webp;base64,${content.image!.toString("base64")}`,
      },
    });
  });

  it("blocks on the blocklist without calling OpenAI", async () => {
    const check = vi.fn(allow);

    await expect(
      moderateTile(
        { ...content, caption: "visit www.spam.co" },
        { apiKey: "sk", blockedTerms: [], check },
      ),
    ).resolves.toEqual({ allowed: false, reason: "blocklist:caption:link" });
    expect(check).not.toHaveBeenCalled();
  });

  it("checks the name as well as the caption", async () => {
    const check = vi.fn(allow);

    await expect(
      moderateTile(
        { ...content, displayName: "badword" },
        { apiKey: "sk", blockedTerms: ["badword"], check },
      ),
    ).resolves.toEqual({ allowed: false, reason: "blocklist:name:badword" });
    expect(check).not.toHaveBeenCalled();
  });

  it("blocks what OpenAI flags and records the categories", async () => {
    const check = vi.fn<typeof checkWithOpenAi>(async () => ({
      flagged: true,
      categories: ["violence"],
    }));

    await expect(
      moderateTile(content, { apiKey: "sk", blockedTerms: [], check }),
    ).resolves.toEqual({ allowed: false, reason: "openai:violence" });
  });

  it("still checks the drawing when there's no text", async () => {
    const check = vi.fn(allow);

    await moderateTile(
      { ...content, displayName: null, caption: null },
      { apiKey: "sk", blockedTerms: [], check },
    );

    expect(check.mock.calls[0][0].text).toBeNull();
    expect(check.mock.calls[0][0].image).not.toBeNull();
  });

  it("passes an outage up to the caller", async () => {
    const check = vi.fn(async () => {
      throw new ModerationUnavailableError("TimeoutError");
    });

    await expect(
      moderateTile(content, { apiKey: "sk", blockedTerms: [], check }),
    ).rejects.toBeInstanceOf(ModerationUnavailableError);
  });
});

describe("checking a username on its own", () => {
  it("sends the name with no image", async () => {
    const check = vi.fn(async () => ({ flagged: false, categories: [] }));

    const decision = await moderateTile(
      { displayName: "Ahmad", caption: null, image: null },
      { apiKey: "sk-test", blockedTerms: [], check },
    );

    expect(decision).toEqual({ allowed: true });
    expect(check).toHaveBeenCalledWith(
      { text: "Ahmad", image: null },
      "sk-test",
    );
  });

  it("still applies the blocklist", async () => {
    const check = vi.fn(async () => ({ flagged: false, categories: [] }));

    const decision = await moderateTile(
      { displayName: "visit example.com", caption: null, image: null },
      { apiKey: "sk-test", blockedTerms: [], check },
    );

    expect(decision).toMatchObject({ allowed: false });
    expect(check).not.toHaveBeenCalled();
  });
});
