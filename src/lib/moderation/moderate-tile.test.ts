// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  type ModerationDeps,
  moderateTile,
  type TileContent,
} from "./moderate-tile";
import type { classifyDrawing } from "./nsfw-drawing";
import { checkWithOpenAi, ModerationUnavailableError } from "./openai";
import type { checkWithVision, VisionVerdict } from "./vision";

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

const nothingSeen: VisionVerdict = {
  text: "",
  symbols: [],
  hateful: false,
  sexual: false,
  reason: "a cat",
};

/** A vision check that reports what it's given, for these tests only. */
function seeing(verdict: Partial<VisionVerdict>) {
  return vi.fn<typeof checkWithVision>(async () => ({
    ...nothingSeen,
    ...verdict,
  }));
}

const allowVision = seeing({});

/** Every dependency stubbed, so no test here ever reaches the network. */
function stubbed(overrides: Partial<ModerationDeps> = {}): ModerationDeps {
  return {
    apiKey: "sk",
    blockedTerms: [],
    profanityTerms: [],
    check: allow,
    checkDrawing: allowDrawing,
    checkVision: allowVision,
    ...overrides,
  };
}

describe("moderateTile", () => {
  it("allows a clean post and sends name, caption and image to OpenAI", async () => {
    const check = vi.fn<typeof checkWithOpenAi>(async () => ({
      flagged: false,
      categories: [],
    }));

    await expect(moderateTile(content, stubbed({ check }))).resolves.toEqual({
      allowed: true,
    });

    expect(check.mock.calls[0][0]).toEqual({
      text: "Ahmad\nmy cat",
      image: {
        dataUrl: `data:image/webp;base64,${content.image!.toString("base64")}`,
      },
    });
  });

  it("blocks on the blocklist without calling any of the other checks", async () => {
    const check = vi.fn(allow);
    const checkDrawing = vi.fn(allowDrawing);
    const checkVision = seeing({});

    await expect(
      moderateTile(
        { ...content, caption: "visit www.spam.co" },
        stubbed({ check, checkDrawing, checkVision }),
      ),
    ).resolves.toEqual({
      allowed: false,
      reason: "blocklist:caption:link",
      category: "contact",
    });
    expect(check).not.toHaveBeenCalled();
    expect(checkDrawing).not.toHaveBeenCalled();
    expect(checkVision).not.toHaveBeenCalled();
  });

  it("checks the name as well as the caption", async () => {
    const check = vi.fn(allow);

    await expect(
      moderateTile(
        { ...content, displayName: "badword" },
        stubbed({ check, blockedTerms: ["badword"] }),
      ),
    ).resolves.toEqual({
      allowed: false,
      reason: "blocklist:name:badword",
      category: "language",
    });
    expect(check).not.toHaveBeenCalled();
  });

  it("blocks what OpenAI flags, with its category", async () => {
    const check = vi.fn<typeof checkWithOpenAi>(async () => ({
      flagged: true,
      categories: ["violence"],
    }));

    await expect(moderateTile(content, stubbed({ check }))).resolves.toEqual({
      allowed: false,
      reason: "openai:violence",
      category: "violent",
    });
  });

  it("blocks what the drawing check flags, even when OpenAI allows it", async () => {
    const checkDrawing = vi.fn<typeof classifyDrawing>(async () => ({
      flagged: true,
      label: "nudity:0.91",
    }));

    await expect(
      moderateTile(content, stubbed({ checkDrawing })),
    ).resolves.toEqual({
      allowed: false,
      reason: "nsfw-drawing:nudity:0.91",
      category: "sexual",
    });
  });

  it("doesn't run the drawing checks when there's no image", async () => {
    const checkDrawing = vi.fn(allowDrawing);
    const checkVision = seeing({});

    await moderateTile(
      { displayName: "Ahmad", caption: "my cat", image: null },
      stubbed({ checkDrawing, checkVision }),
    );

    expect(checkDrawing).not.toHaveBeenCalled();
    expect(checkVision).not.toHaveBeenCalled();
  });

  it("still checks the drawing when there's no text", async () => {
    const check = vi.fn(allow);

    await moderateTile(
      { ...content, displayName: null, caption: null },
      stubbed({ check }),
    );

    expect(check.mock.calls[0][0].text).toBeNull();
    expect(check.mock.calls[0][0].image).not.toBeNull();
  });

  it("passes an outage up to the caller", async () => {
    const check = vi.fn(async () => {
      throw new ModerationUnavailableError("TimeoutError");
    });

    await expect(
      moderateTile(content, stubbed({ check })),
    ).rejects.toBeInstanceOf(ModerationUnavailableError);
  });
});

describe("reading the drawing", () => {
  it("gives the vision check the drawing and the caption together", async () => {
    const checkVision = seeing({});

    await moderateTile(content, stubbed({ checkVision }));

    const [image, caption] = checkVision.mock.calls[0];
    expect(image.dataUrl).toMatch(/^data:image\/webp;base64,/);
    expect(caption).toBe("my cat");
  });

  it("blocks a hate symbol even when every other check allows it", async () => {
    await expect(
      moderateTile(
        content,
        stubbed({ checkVision: seeing({ symbols: ["swastika"] }) }),
      ),
    ).resolves.toEqual({
      allowed: false,
      reason: "vision:hateful:swastika",
      category: "hateful",
    });
  });

  it("blocks a drawing or caption the model reads as hateful", async () => {
    await expect(
      moderateTile(
        content,
        stubbed({
          checkVision: seeing({ hateful: true, reason: "demeaning message" }),
        }),
      ),
    ).resolves.toMatchObject({ allowed: false, category: "hateful" });
  });

  it("blocks sexual content the model sees", async () => {
    await expect(
      moderateTile(content, stubbed({ checkVision: seeing({ sexual: true }) })),
    ).resolves.toMatchObject({ allowed: false, category: "sexual" });
  });

  it("runs text written in the drawing through DrawPin's own list", async () => {
    // The model read the word but didn't call it hateful; the list still does.
    await expect(
      moderateTile(
        content,
        stubbed({
          profanityTerms: [{ term: "zzfakeslur", category: "hateful" }],
          checkVision: seeing({ text: "super zzfakeslur" }),
        }),
      ),
    ).resolves.toEqual({
      allowed: false,
      reason: "blocklist:drawing:zzfakeslur",
      category: "hateful",
    });
  });

  it("catches a link or phone number drawn into the picture", async () => {
    await expect(
      moderateTile(
        content,
        stubbed({ checkVision: seeing({ text: "call 555 867 5309" }) }),
      ),
    ).resolves.toMatchObject({ allowed: false, category: "contact" });
  });

  it("passes a vision outage up, so the post isn't published unread", async () => {
    const checkVision = vi.fn<typeof checkWithVision>(async () => {
      throw new ModerationUnavailableError("vision: TimeoutError");
    });

    await expect(
      moderateTile(content, stubbed({ checkVision })),
    ).rejects.toBeInstanceOf(ModerationUnavailableError);
  });
});

describe("built-in profanity list", () => {
  it("blocks a listed term without calling OpenAI", async () => {
    const check = vi.fn(allow);

    await expect(
      moderateTile(
        { ...content, caption: "a zzfakebadword caption" },
        stubbed({ check, profanityTerms: [{ term: "zzfakebadword" }] }),
      ),
    ).resolves.toEqual({
      allowed: false,
      reason: "blocklist:caption:zzfakebadword",
      category: "language",
    });
    expect(check).not.toHaveBeenCalled();
  });

  it("defaults to the real list when none is injected", async () => {
    // Not a claim about specific words — just that the default list is
    // wired up and doesn't block an ordinary caption.
    await expect(
      moderateTile(content, stubbed({ profanityTerms: undefined })),
    ).resolves.toEqual({
      allowed: true,
    });
  });
});

describe("checking a username on its own", () => {
  it("sends the name with no image", async () => {
    const check = vi.fn(async () => ({ flagged: false, categories: [] }));

    const decision = await moderateTile(
      { displayName: "Ahmad", caption: null, image: null },
      stubbed({ apiKey: "sk-test", check }),
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
      stubbed({ check }),
    );

    expect(decision).toMatchObject({ allowed: false });
    expect(check).not.toHaveBeenCalled();
  });
});
