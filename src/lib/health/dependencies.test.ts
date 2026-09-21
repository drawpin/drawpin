// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { checkOpenAiKey, checkTurnstileSecret } from "./dependencies";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe("checkOpenAiKey", () => {
  it("is happy when the key is accepted", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({}));

    await expect(checkOpenAiKey("sk-test", fetchMock)).resolves.toBeNull();
  });

  it("names a rejected key", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({}, 401));

    // The failure that would otherwise look like a quiet evening: every post
    // refused because moderation can't run.
    await expect(checkOpenAiKey("sk-expired", fetchMock)).resolves.toBe(
      "key rejected",
    );
  });

  it("reports an outage as itself, not as a bad key", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({}, 500));

    await expect(checkOpenAiKey("sk-test", fetchMock)).resolves.toBe(
      "HTTP 500",
    );
  });
});

describe("checkTurnstileSecret", () => {
  it("is happy when only the token is rejected", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        json({ success: false, "error-codes": ["invalid-input-response"] }),
      );

    // Which is expected: the check deliberately sends a token that can't work.
    await expect(checkTurnstileSecret("secret", fetchMock)).resolves.toBeNull();
  });

  it("names a rejected secret", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        json({ success: false, "error-codes": ["invalid-input-secret"] }),
      );

    await expect(checkTurnstileSecret("wrong", fetchMock)).resolves.toBe(
      "secret rejected",
    );
  });

  it("names a missing secret", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        json({ success: false, "error-codes": ["missing-input-secret"] }),
      );

    await expect(checkTurnstileSecret("", fetchMock)).resolves.toBe(
      "secret missing",
    );
  });

  it("reports an outage", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({}, 502));

    await expect(checkTurnstileSecret("secret", fetchMock)).resolves.toBe(
      "HTTP 502",
    );
  });
});
