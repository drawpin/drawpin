import { beforeEach, describe, expect, it, vi } from "vitest";
import { changeUsername, type ChangeNameDeps } from "./change-username";

describe("changeUsername", () => {
  let deps: ChangeNameDeps;

  beforeEach(() => {
    deps = {
      problem: vi.fn(async () => null),
      save: vi.fn(async () => {}),
    };
  });

  it("saves a trimmed, allowed name", async () => {
    const result = await changeUsername("  Ahmad  ", "Old", deps);
    expect(result).toEqual({ status: "saved" });
    expect(deps.problem).toHaveBeenCalledWith("Ahmad");
    expect(deps.save).toHaveBeenCalledWith("Ahmad");
  });

  it("refuses an empty name without checking or saving", async () => {
    const result = await changeUsername("   ", "Old", deps);
    expect(result).toEqual({
      status: "error",
      message: "Pick a name to draw under.",
    });
    expect(deps.problem).not.toHaveBeenCalled();
    expect(deps.save).not.toHaveBeenCalled();
  });

  it("refuses a name over 40 characters", async () => {
    const result = await changeUsername("x".repeat(41), "Old", deps);
    expect(result).toMatchObject({ status: "error" });
    expect(deps.save).not.toHaveBeenCalled();
  });

  it("refuses a missing field", async () => {
    expect(await changeUsername(null, "Old", deps)).toMatchObject({
      status: "error",
    });
  });

  it("shows moderation's reason and doesn't save", async () => {
    deps.problem = vi.fn(async () => "Pick a different name.");
    const result = await changeUsername("Rude", "Old", deps);
    expect(result).toEqual({
      status: "error",
      message: "Pick a different name.",
    });
    expect(deps.save).not.toHaveBeenCalled();
  });

  it("treats the current name as done, without a moderation call", async () => {
    const result = await changeUsername(" Ahmad ", "Ahmad", deps);
    expect(result).toEqual({ status: "saved" });
    expect(deps.problem).not.toHaveBeenCalled();
    expect(deps.save).not.toHaveBeenCalled();
  });

  it("reports a failed save", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    deps.save = vi.fn(async () => {
      throw new Error("db down");
    });
    const result = await changeUsername("Ahmad", "Old", deps);
    expect(result).toMatchObject({
      status: "error",
      message: "We couldn't save that name. Try again in a moment.",
    });
  });
});
