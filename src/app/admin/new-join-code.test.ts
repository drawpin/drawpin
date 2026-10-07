// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOwnedVenue = vi.fn();
const replaceJoinCode = vi.fn();
const revalidatePath = vi.fn();
const admin = { tag: "service-role client" };

vi.mock("./venue", () => ({ requireOwnedVenue }));
vi.mock("@/lib/join-code/ensure", () => ({ replaceJoinCode }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => admin }));
vi.mock("next/cache", () => ({ revalidatePath }));

const { newJoinCodeAction } = await import("./actions");

const VENUE_ID = "5d1c0b8e-6a3f-4c2e-8f1d-2b7a9c4e6f10";

describe("newJoinCodeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
    requireOwnedVenue.mockResolvedValue({ id: VENUE_ID });
  });

  it("replaces the signed-in owner's code and refreshes the page", async () => {
    replaceJoinCode.mockResolvedValue("87654321");

    await expect(newJoinCodeAction()).resolves.toEqual({ status: "changed" });
    expect(replaceJoinCode).toHaveBeenCalledWith(admin, VENUE_ID);
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("never logs the new code", async () => {
    replaceJoinCode.mockResolvedValue("87654321");

    await newJoinCodeAction();

    expect(console.info).not.toHaveBeenCalledWith(
      expect.stringContaining("87654321"),
    );
  });

  it("acts only on the owner's own board", async () => {
    requireOwnedVenue.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(newJoinCodeAction()).rejects.toThrow("NEXT_REDIRECT");
    expect(replaceJoinCode).not.toHaveBeenCalled();
  });

  it("says so when the code couldn't be replaced", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    replaceJoinCode.mockRejectedValue(new Error("boom"));

    const result = await newJoinCodeAction();

    expect(result.status).toBe("error");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
