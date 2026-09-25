// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { ModerationUnavailableError } from "./openai";
import { checkWithVision, type VisionVerdict } from "./vision";

const image = { dataUrl: "data:image/webp;base64,AAAA" };

const seen: VisionVerdict = {
  text: "hello",
  symbols: [],
  hateful: false,
  sexual: false,
  reason: "a greeting",
};

/** A chat-completions response carrying the verdict as its message. */
function answer(verdict: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(verdict) } }],
    }),
    { status },
  );
}

describe("checkWithVision", () => {
  it("returns what the model saw", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => answer(seen));

    await expect(
      checkWithVision(image, "hi", "sk", fetchImpl),
    ).resolves.toEqual(seen);
  });

  it("sends the drawing in full detail together with the caption", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => answer(seen));

    await checkWithVision(image, "  my cat  ", "sk", fetchImpl);

    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(body.model).toBe("gpt-4.1-mini");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.temperature).toBe(0);
    const [text, picture] = body.messages[1].content;
    expect(text).toEqual({ type: "text", text: "Caption: my cat" });
    expect(picture.image_url).toEqual({ url: image.dataUrl, detail: "high" });
  });

  it("says there's no caption rather than sending an empty one", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => answer(seen));

    await checkWithVision(image, null, "sk", fetchImpl);

    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(body.messages[1].content[0].text).toBe("Caption: (none)");
  });

  it("asks for cartoon nudity to be allowed", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => answer(seen));

    await checkWithVision(image, null, "sk", fetchImpl);

    // The policy lives in the instructions (ADR-006): genitals or sexual
    // acts only, so a drawn chest isn't refused.
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(body.messages[0].content).toMatch(/genitals or a sexual act/);
    expect(body.messages[0].content).toMatch(/nipples, is not sexual/);
  });

  it("tries once more after a failure", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(answer(seen));

    await expect(
      checkWithVision(image, null, "sk", fetchImpl),
    ).resolves.toEqual(seen);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("gives up as unavailable after the retry fails", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response("", { status: 503 }),
    );

    await expect(
      checkWithVision(image, null, "sk", fetchImpl),
    ).rejects.toBeInstanceOf(ModerationUnavailableError);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("treats an answer it can't read as unavailable, never as allowed", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      answer({ looks: "fine" }),
    );

    await expect(
      checkWithVision(image, null, "sk", fetchImpl),
    ).rejects.toBeInstanceOf(ModerationUnavailableError);
  });

  it("treats a network error as unavailable", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(
      checkWithVision(image, null, "sk", fetchImpl),
    ).rejects.toBeInstanceOf(ModerationUnavailableError);
  });
});
