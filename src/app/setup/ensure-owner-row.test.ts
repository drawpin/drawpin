// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { ensureOwnerRow } from "./ensure-owner-row";

const user = { id: "user-1", email: "owner@example.com" };

describe("ensureOwnerRow", () => {
  it("writes the owner row", async () => {
    const upsert = vi.fn(async () => ({ error: null }));

    await ensureOwnerRow(user, upsert);

    expect(upsert).toHaveBeenCalledWith({
      id: "user-1",
      email: "owner@example.com",
    });
  });

  it("can be called again after a failed setup attempt", async () => {
    const upsert = vi.fn(async () => ({ error: null }));

    await ensureOwnerRow(user, upsert);
    await expect(ensureOwnerRow(user, upsert)).resolves.toBeUndefined();
  });

  it("stores an empty email rather than failing without one", async () => {
    const upsert = vi.fn(async () => ({ error: null }));

    await ensureOwnerRow({ id: "user-1" }, upsert);

    expect(upsert).toHaveBeenCalledWith({ id: "user-1", email: "" });
  });

  it("surfaces a write failure", async () => {
    const upsert = vi.fn(async () => ({ error: { message: "no grant" } }));

    await expect(ensureOwnerRow(user, upsert)).rejects.toThrow(/no grant/);
  });
});
