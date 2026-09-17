// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { stubServerEnv } from "@/lib/testing/server-env";
import { TurnstileUnavailableError, verifyTurnstileToken } from "./verify";

beforeEach(() => {
  stubServerEnv();
});

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 });

describe("verifyTurnstileToken", () => {
  it("passes a good token and sends the secret", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(ok({ success: true }));

    await expect(verifyTurnstileToken("token-1", fetchMock)).resolves.toEqual({
      passed: true,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    const body = new URLSearchParams(String(init?.body));
    expect(body.get("secret")).toBe("secret-key");
    expect(body.get("response")).toBe("token-1");
  });

  it("fails an expired or reused token without calling it an outage", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        ok({ success: false, "error-codes": ["timeout-or-duplicate"] }),
      );

    await expect(verifyTurnstileToken("token-1", fetchMock)).resolves.toEqual({
      passed: false,
      codes: ["timeout-or-duplicate"],
    });
  });

  it("fails an empty token without asking Cloudflare", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    await expect(verifyTurnstileToken("", fetchMock)).resolves.toEqual({
      passed: false,
      codes: ["missing-input-response"],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retries once, then succeeds", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("nope", { status: 502 }))
      .mockResolvedValueOnce(ok({ success: true }));

    await expect(verifyTurnstileToken("token-1", fetchMock)).resolves.toEqual({
      passed: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      "a timeout",
      () =>
        Promise.reject(Object.assign(new Error("t"), { name: "TimeoutError" })),
    ],
    [
      "repeated server errors",
      async () => new Response("nope", { status: 500 }),
    ],
    ["an unreadable body", async () => ok({ nope: true })],
  ])("treats %s as unavailable rather than passed", async (_label, impl) => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(impl as never);

    await expect(
      verifyTurnstileToken("token-1", fetchMock),
    ).rejects.toBeInstanceOf(TurnstileUnavailableError);
  });
});
