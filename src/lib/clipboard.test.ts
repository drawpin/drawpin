import { describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

describe("copyText", () => {
  it("writes the text and reports success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(copyText("12345678", { writeText })).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("12345678");
  });

  it("reports failure when the browser refuses the write", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("NotAllowedError"));
    await expect(copyText("12345678", { writeText })).resolves.toBe(false);
  });

  it("reports failure when there is no clipboard", async () => {
    await expect(copyText("12345678", undefined)).resolves.toBe(false);
  });
});
