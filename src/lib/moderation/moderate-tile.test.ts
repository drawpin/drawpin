// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { moderateTile, type TileContent } from "./moderate-tile";
import type { classifyDrawing } from "./nsfw-drawing";
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

/** Never flags. Real drawing classification is exercised in
 * nsfw-drawing.test.ts; here it's just a dependency to control. */
const allowDrawing = vi.fn<typeof classifyDrawing>(async () => ({
  flagged: false,
  label: "test",
}));

describe("moderateTile", () => {
  it("allows a clean post and sends name, caption and image to OpenAI", async () => {
    const check = vi.fn<typeof checkWithOpenAi>(async () => ({
      flagged: false,
      categories: [],
    }));

    await expect(
      moderateTile(content, {
        apiKey: "sk",
        blockedTerms: [],
        profanityTerms: [],
        check,
        checkDrawing: allowDrawing,
      }),
    ).resolves.toEqual({ allowed: true });

    expect(check.mock.calls[0][0]).toEqual({
      text: "Ahmad\nmy cat",
      image: {
        dataUrl: `data:image/webp;base64,${content.image!.toString("base64")}`,
      },
    });
  });

  it("blocks on the blocklist without calling OpenAI or the drawing check", async () => {
    const check = vi.fn(allow);
    const checkDrawing = vi.fn(allowDrawing);

    await expect(
      moderateTile(
        { ...content, caption: "visit www.spam.co" },
        {
          apiKey: "sk",
          blockedTerms: [],
          profanityTerms: [],
          check,
          checkDrawing,
        },
      ),
    ).resolves.toEqual({ allowed: false, reason: "blocklist:caption:link" });
    expect(check).not.toHaveBeenCalled();
    expect(checkDrawing).not.toHaveBeenCalled();
  });

  it("checks the name as well as the caption", async () => {
    const check = vi.fn(allow);

    await expect(
      moderateTile(
        { ...content, displayName: "badword" },
        {
          apiKey: "sk",
          blockedTerms: ["badword"],
          profanityTerms: [],
          check,
          checkDrawing: allowDrawing,
        },
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
      moderateTile(content, {
        apiKey: "sk",
        blockedTerms: [],
        profanityTerms: [],
        check,
        checkDrawing: allowDrawing,
      }),
    ).resolves.toEqual({ allowed: false, reason: "openai:violence" });
  });

  it("blocks what the drawing check flags, even when OpenAI allows it", async () => {
    const checkDrawing = vi.fn<typeof classifyDrawing>(async () => ({
      flagged: true,
      label: "nudity:0.91",
    }));

    await expect(
      moderateTile(content, {
        apiKey: "sk",
        blockedTerms: [],
        profanityTerms: [],
        check: allow,
        checkDrawing,
      }),
    ).resolves.toEqual({
      allowed: false,
      reason: "nsfw-drawing:nudity:0.91",
    });
  });

  it("doesn't run the drawing check when there's no image", async () => {
    const checkDrawing = vi.fn(allowDrawing);

    await moderateTile(
      { displayName: "Ahmad", caption: "my cat", image: null },
      {
        apiKey: "sk",
        blockedTerms: [],
        profanityTerms: [],
        check: allow,
        checkDrawing,
      },
    );

    expect(checkDrawing).not.toHaveBeenCalled();
  });

  it("still checks the drawing when there's no text", async () => {
    const check = vi.fn(allow);

    await moderateTile(
      { ...content, displayName: null, caption: null },
      {
        apiKey: "sk",
        blockedTerms: [],
        profanityTerms: [],
        check,
        checkDrawing: allowDrawing,
      },
    );

    expect(check.mock.calls[0][0].text).toBeNull();
    expect(check.mock.calls[0][0].image).not.toBeNull();
  });

  it("passes an outage up to the caller", async () => {
    const check = vi.fn(async () => {
      throw new ModerationUnavailableError("TimeoutError");
    });

    await expect(
      moderateTile(content, {
        apiKey: "sk",
        blockedTerms: [],
        profanityTerms: [],
        check,
        checkDrawing: allowDrawing,
      }),
    ).rejects.toBeInstanceOf(ModerationUnavailableError);
  });
});

describe("built-in profanity list", () => {
  it("blocks a listed term without calling OpenAI", async () => {
    const check = vi.fn(allow);

    await expect(
      moderateTile(
        { ...content, caption: "a zzfakebadword caption" },
        {
          apiKey: "sk",
          blockedTerms: [],
          profanityTerms: [{ term: "zzfakebadword" }],
          check,
          checkDrawing: allowDrawing,
        },
      ),
    ).resolves.toEqual({
      allowed: false,
      reason: "blocklist:caption:zzfakebadword",
    });
    expect(check).not.toHaveBeenCalled();
  });

  it("defaults to the real list when none is injected", async () => {
    const check = vi.fn(allow);

    // Not a claim about specific words — just that the default list is
    // wired up and doesn't block an ordinary caption.
    await expect(
      moderateTile(content, {
        apiKey: "sk",
        blockedTerms: [],
        checkDrawing: allowDrawing,
        check,
      }),
    ).resolves.toEqual({ allowed: true });
  });
});

describe("checking a username on its own", () => {
  it("sends the name with no image", async () => {
    const check = vi.fn(async () => ({ flagged: false, categories: [] }));

    const decision = await moderateTile(
      { displayName: "Ahmad", caption: null, image: null },
      { apiKey: "sk-test", blockedTerms: [], profanityTerms: [], check },
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
      { apiKey: "sk-test", blockedTerms: [], profanityTerms: [], check },
    );

    expect(decision).toMatchObject({ allowed: false });
    expect(check).not.toHaveBeenCalled();
  });
});
