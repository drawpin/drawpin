import { describe, expect, it, vi } from "vitest";
import { renameVenue } from "./rename-venue";

const ok = async () => ({ error: null });

describe("renameVenue", () => {
  it("writes the new name", async () => {
    const update = vi.fn(ok);

    await expect(
      renameVenue("Corner Cofee", "Corner Coffee", update),
    ).resolves.toBe("renamed");
    expect(update).toHaveBeenCalledWith("Corner Coffee");
  });

  it("does nothing when the name is already that, so a double submit is free", async () => {
    const update = vi.fn(ok);

    await expect(
      renameVenue("Corner Coffee", "Corner Coffee", update),
    ).resolves.toBe("unchanged");
    expect(update).not.toHaveBeenCalled();
  });

  it("surfaces a database failure rather than reporting success", async () => {
    const update = vi.fn(async () => ({ error: { message: "timeout" } }));

    await expect(
      renameVenue("Corner Cofee", "Corner Coffee", update),
    ).rejects.toThrow("Could not rename venue: timeout");
  });
});
