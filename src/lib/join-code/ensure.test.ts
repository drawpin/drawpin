// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { ensureJoinCode, replaceJoinCode } from "./ensure";

const VENUE = "5d1c0b8e-6a3f-4c2e-8f1d-2b7a9c4e6f10";

/** A client whose only method is the `rpc` call these make. */
function clientReturning(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { admin: { rpc } as unknown as SupabaseClient, rpc };
}

describe("ensureJoinCode", () => {
  it("returns the board's code from the database", async () => {
    const { admin, rpc } = clientReturning({ data: "12345678", error: null });

    await expect(ensureJoinCode(admin, VENUE)).resolves.toBe("12345678");
    expect(rpc).toHaveBeenCalledWith("ensure_join_code", { p_venue_id: VENUE });
  });

  it("throws when the database refuses", async () => {
    const { admin } = clientReturning({
      data: null,
      error: { message: "boom" },
    });

    await expect(ensureJoinCode(admin, VENUE)).rejects.toThrow(
      "ensureJoinCode: boom",
    );
  });
});

describe("replaceJoinCode", () => {
  it("returns the new code", async () => {
    const { admin, rpc } = clientReturning({ data: "87654321", error: null });

    await expect(replaceJoinCode(admin, VENUE)).resolves.toBe("87654321");
    expect(rpc).toHaveBeenCalledWith("replace_join_code", {
      p_venue_id: VENUE,
    });
  });

  it("throws when the database refuses", async () => {
    const { admin } = clientReturning({
      data: null,
      error: { message: "boom" },
    });

    await expect(replaceJoinCode(admin, VENUE)).rejects.toThrow(
      "replaceJoinCode: boom",
    );
  });
});
