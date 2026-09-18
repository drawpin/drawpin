// @vitest-environment node
import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { isOwnerAccount } from "./auth";

const userWith = (appMetadata: object) =>
  ({ app_metadata: appMetadata }) as User;

describe("isOwnerAccount", () => {
  it("accepts an account that signed in by email", () => {
    expect(
      isOwnerAccount(userWith({ provider: "email", providers: ["email"] })),
    ).toBe(true);
  });

  it("rejects a customer's Google account", () => {
    expect(
      isOwnerAccount(userWith({ provider: "google", providers: ["google"] })),
    ).toBe(false);
  });

  it("accepts an owner who later linked Google to the same account", () => {
    expect(
      isOwnerAccount(
        userWith({ provider: "google", providers: ["email", "google"] }),
      ),
    ).toBe(true);
  });

  it("falls back to the single provider when there's no list", () => {
    expect(isOwnerAccount(userWith({ provider: "email" }))).toBe(true);
    expect(isOwnerAccount(userWith({ provider: "google" }))).toBe(false);
  });

  it("rejects an account with no provider at all", () => {
    expect(isOwnerAccount(userWith({}))).toBe(false);
  });
});
