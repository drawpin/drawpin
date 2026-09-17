// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyTurnstileToken = vi.fn();
vi.mock("./verify", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./verify")>()),
  verifyTurnstileToken,
}));

const { checkTurnstile } = await import("./guard");
const { TurnstileUnavailableError } = await import("./verify");

beforeEach(() => {
  verifyTurnstileToken.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("checkTurnstile", () => {
  it("passes a verified token", async () => {
    verifyTurnstileToken.mockResolvedValue({ passed: true });

    await expect(checkTurnstile("token-1")).resolves.toBeNull();
    expect(verifyTurnstileToken).toHaveBeenCalledWith("token-1");
  });

  it("refuses a rejected token", async () => {
    verifyTurnstileToken.mockResolvedValue({
      passed: false,
      codes: ["timeout-or-duplicate"],
    });

    await expect(checkTurnstile("token-1")).resolves.toMatch(
      /automated request/,
    );
  });

  it.each([null, undefined, new File([], "x")])(
    "refuses a non-string field (%o)",
    async (field) => {
      verifyTurnstileToken.mockResolvedValue({ passed: false, codes: [] });

      await expect(
        checkTurnstile(field as FormDataEntryValue | null),
      ).resolves.toMatch(/automated request/);
      expect(verifyTurnstileToken).toHaveBeenCalledWith("");
    },
  );

  it("refuses when Cloudflare can't be reached", async () => {
    verifyTurnstileToken.mockRejectedValue(
      new TurnstileUnavailableError("TimeoutError"),
    );

    await expect(checkTurnstile("token-1")).resolves.toMatch(
      /couldn't check your browser/,
    );
  });

  it("lets an unexpected error surface", async () => {
    verifyTurnstileToken.mockRejectedValue(new Error("boom"));

    await expect(checkTurnstile("token-1")).rejects.toThrow("boom");
  });
});
