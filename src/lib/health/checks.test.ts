// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { runChecks } from "./checks";

describe("runChecks", () => {
  it("passes when every check is happy", async () => {
    const report = await runChecks({
      database: async () => null,
      storage: async () => null,
    });

    expect(report).toEqual({
      ok: true,
      checks: [
        { name: "database", ok: true },
        { name: "storage", ok: true },
      ],
    });
  });

  it("reports which one failed, and why", async () => {
    const report = await runChecks({
      database: async () => null,
      openai: async () => "key rejected",
    });

    expect(report.ok).toBe(false);
    expect(report.checks).toContainEqual({
      name: "openai",
      ok: false,
      detail: "key rejected",
    });
  });

  it("runs every check, so one failure doesn't hide another", async () => {
    const storage = vi.fn(async () => null);

    const report = await runChecks({
      database: async () => "unreachable",
      storage,
    });

    expect(storage).toHaveBeenCalled();
    expect(report.checks).toHaveLength(2);
  });

  it("treats a check that throws as a failure", async () => {
    const report = await runChecks({
      turnstile: async () => {
        throw new Error("timed out");
      },
    });

    expect(report.checks[0]).toEqual({
      name: "turnstile",
      ok: false,
      detail: "timed out",
    });
  });
});
