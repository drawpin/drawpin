// @vitest-environment node
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getOwner = vi.fn<() => Promise<User | null>>();
vi.mock("@/lib/auth", () => ({ getOwner }));

const { getCustomer } = await import("./customer");

const signedIn = (id: string) => ({ id }) as User;

/** A client whose `profiles` lookup returns whatever the test sets up. */
const clientReturning = (
  result:
    | { data: { id: string; username: string } | null; error: null }
    | {
        data: null;
        error: { message: string };
      },
) =>
  ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => result }),
      }),
    }),
  }) as unknown as SupabaseClient;

beforeEach(() => {
  getOwner.mockReset();
});

describe("getCustomer", () => {
  it("returns the signed-in customer's profile", async () => {
    getOwner.mockResolvedValue(signedIn("user-1"));
    const admin = clientReturning({
      data: { id: "user-1", username: "Ahmad" },
      error: null,
    });

    await expect(getCustomer(admin)).resolves.toEqual({
      id: "user-1",
      username: "Ahmad",
    });
  });

  it("treats a visitor who isn't signed in as a guest", async () => {
    getOwner.mockResolvedValue(null);
    const admin = clientReturning({ data: null, error: null });

    await expect(getCustomer(admin)).resolves.toBeNull();
  });

  it("treats a signed-in owner with no profile as a guest", async () => {
    getOwner.mockResolvedValue(signedIn("owner-1"));
    const admin = clientReturning({ data: null, error: null });

    await expect(getCustomer(admin)).resolves.toBeNull();
  });

  it("surfaces a lookup failure instead of silently posting as a guest", async () => {
    getOwner.mockResolvedValue(signedIn("user-1"));
    const admin = clientReturning({ data: null, error: { message: "boom" } });

    await expect(getCustomer(admin)).rejects.toThrow(/boom/);
  });
});
