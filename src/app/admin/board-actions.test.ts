// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOwnedVenueForAction = vi.fn();
const changeBoardLink = vi.fn();
const closeBoard = vi.fn();
const signOut = vi.fn();
const revalidatePath = vi.fn();
const redirect = vi.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT ${to}`);
});

vi.mock("./venue", () => ({
  requireOwnedVenueForAction,
  SupabaseCloseBoardStore: class {},
}));
vi.mock("./change-board-link", () => ({ changeBoardLink }));
vi.mock("./close-board", () => ({ closeBoard }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut } }),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));

const { changeBoardLinkAction, closeBoardAction } = await import("./actions");

const venue = {
  id: "5d1c0b8e-6a3f-4c2e-8f1d-2b7a9c4e6f10",
  ownerId: "owner-1",
  name: "Maple Street Café",
  slug: "maple-street-cafe-k7m2",
};

function form(fields: Record<string, string> = {}): FormData {
  const data = new FormData();
  data.set("boardId", venue.id);
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  requireOwnedVenueForAction.mockResolvedValue(venue);
  signOut.mockResolvedValue({ error: null });
});

describe("changeBoardLinkAction", () => {
  it("moves the owner to the admin page at the new slug", async () => {
    changeBoardLink.mockResolvedValue("maple-street-cafe-z9y8");
    const data = form();

    await expect(
      changeBoardLinkAction({ status: "idle" }, data),
    ).rejects.toThrow("NEXT_REDIRECT /admin/maple-street-cafe-z9y8?link=1");
    expect(requireOwnedVenueForAction).toHaveBeenCalledWith(data);
  });

  it("acts only on a board the account owns", async () => {
    requireOwnedVenueForAction.mockRejectedValue(
      new Error("NEXT_REDIRECT /admin"),
    );

    await expect(
      changeBoardLinkAction({ status: "idle" }, form()),
    ).rejects.toThrow(/^NEXT_REDIRECT \/admin$/);
    expect(changeBoardLink).not.toHaveBeenCalled();
  });
});

describe("closeBoardAction", () => {
  it("keeps the session and goes to /admin while the account has more", async () => {
    closeBoard.mockResolvedValue("closed");

    await expect(
      closeBoardAction({ status: "idle" }, form({ name: venue.name })),
    ).rejects.toThrow(/^NEXT_REDIRECT \/admin$/);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signs out and goes home when the account went with its last board", async () => {
    closeBoard.mockResolvedValue("closed-account");

    await expect(
      closeBoardAction({ status: "idle" }, form({ name: venue.name })),
    ).rejects.toThrow(/^NEXT_REDIRECT \/$/);
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("asks again when the name doesn't match", async () => {
    closeBoard.mockResolvedValue("name-mismatch");

    const result = await closeBoardAction(
      { status: "idle" },
      form({ name: "Maple" }),
    );

    expect(result.status).toBe("error");
    expect(redirect).not.toHaveBeenCalled();
  });
});
