// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  checkWithOpenAi,
  ModerationUnavailableError,
  type ModerationInput,
} from "./openai";

const input: ModerationInput = {
  text: "hello",
  image: { dataUrl: "data:image/webp;base64,AAAA" },
};

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 });

const clean = {
  results: [{ flagged: false, categories: { violence: false, hate: null } }],
};

describe("checkWithOpenAi", () => {
  it("sends the text and image together and reports a clean result", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(ok(clean));

    await expect(checkWithOpenAi(input, "sk-test", fetchMock)).resolves.toEqual(
      {
        flagged: false,
        categories: [],
      },
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/moderations");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer sk-test" });
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("omni-moderation-latest");
    expect(body.input).toEqual([
      { type: "text", text: "hello" },
      {
        type: "image_url",
        image_url: { url: "data:image/webp;base64,AAAA" },
      },
    ]);
  });

  it("reports which categories tripped", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      ok({
        results: [
          {
            flagged: true,
            categories: { violence: true, "self-harm": false, sexual: true },
          },
        ],
      }),
    );

    await expect(checkWithOpenAi(input, "sk-test", fetchMock)).resolves.toEqual(
      {
        flagged: true,
        categories: ["sexual", "violence"],
      },
    );
  });

  it("skips the call when there's nothing to check", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    await expect(
      checkWithOpenAi({ text: null, image: null }, "sk-test", fetchMock),
    ).resolves.toEqual({ flagged: false, categories: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retries once on a server error, then succeeds", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("nope", { status: 503 }))
      .mockResolvedValueOnce(ok(clean));

    await expect(checkWithOpenAi(input, "sk-test", fetchMock)).resolves.toEqual(
      {
        flagged: false,
        categories: [],
      },
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a rate limit but gives up after two attempts", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("slow down", { status: 429 }));

    await expect(
      checkWithOpenAi(input, "sk-test", fetchMock),
    ).rejects.toBeInstanceOf(ModerationUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("doesn't retry a bad key", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("unauthorized", { status: 401 }));

    await expect(checkWithOpenAi(input, "sk-test", fetchMock)).rejects.toThrow(
      /HTTP 401/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats a timeout or network failure as unavailable", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(
        Object.assign(new Error("timed out"), { name: "TimeoutError" }),
      );

    await expect(checkWithOpenAi(input, "sk-test", fetchMock)).rejects.toThrow(
      /TimeoutError/,
    );
  });

  it("treats an unreadable body as unavailable rather than clean", async () => {
    // A fresh Response per call: a body can only be read once, and both
    // attempts need to hit the same parse failure.
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => ok({ results: [] }));

    await expect(checkWithOpenAi(input, "sk-test", fetchMock)).rejects.toThrow(
      /unexpected response shape/,
    );
  });
});
