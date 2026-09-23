import { describe, expect, it, vi } from "vitest";
import { alertBody, sendHealthAlert } from "./alert";
import type { HealthReport } from "./checks";

const failing: HealthReport = {
  ok: false,
  checks: [
    { name: "database", ok: true },
    { name: "openai", ok: false, detail: "key rejected" },
    { name: "turnstile", ok: false },
  ],
};

const ok = (): Response => new Response("{}", { status: 200 });

describe("alertBody", () => {
  it("names every check and what went wrong", () => {
    const body = alertBody(failing);

    expect(body).toContain("FAILED  openai — key rejected");
    expect(body).toContain("FAILED  turnstile");
    expect(body).toContain("ok  database");
  });

  it("says what the failure costs, not just that there was one", () => {
    expect(alertBody(failing)).toContain("Posting is refused");
  });
});

describe("sendHealthAlert", () => {
  it("does nothing without a key, so an unconfigured deployment still runs", async () => {
    const fetchImpl = vi.fn();

    await expect(sendHealthAlert(failing, undefined, fetchImpl)).resolves.toBe(
      null,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("subjects the email with the checks that failed", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok());

    await sendHealthAlert(failing, "re_test", fetchImpl);

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(body.subject).toBe("DrawPin health check failed: openai, turnstile");
    expect(body.to).toEqual(["hello@drawpin.io"]);
  });

  it("reports a refused send rather than throwing", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("nope", { status: 403 }));

    await expect(sendHealthAlert(failing, "re_test", fetchImpl)).resolves.toBe(
      "Resend returned HTTP 403",
    );
  });

  it("reports a network failure rather than throwing", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(sendHealthAlert(failing, "re_test", fetchImpl)).resolves.toBe(
      "offline",
    );
  });
});
