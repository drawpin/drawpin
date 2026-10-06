// @vitest-environment node
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  type AccountKind,
  canSetUpBoard,
  classifyAccount,
  getAccount,
  signedInByEmail,
  signedInLoginDestination,
} from "./auth";

const userWith = (appMetadata: object) =>
  ({ id: "user-1", app_metadata: appMetadata }) as User;

const emailUser = userWith({ provider: "email", providers: ["email"] });
const googleUser = userWith({ provider: "google", providers: ["google"] });

describe("signedInByEmail", () => {
  it("accepts an account that signed in by email", () => {
    expect(signedInByEmail(emailUser)).toBe(true);
  });

  it("rejects a Google-only account", () => {
    expect(signedInByEmail(googleUser)).toBe(false);
  });

  it("accepts an account that has both", () => {
    expect(
      signedInByEmail(
        userWith({ provider: "google", providers: ["email", "google"] }),
      ),
    ).toBe(true);
  });

  it("falls back to the single provider when there's no list", () => {
    expect(signedInByEmail(userWith({ provider: "email" }))).toBe(true);
    expect(signedInByEmail(userWith({ provider: "google" }))).toBe(false);
  });

  it("rejects an account with no provider at all", () => {
    expect(signedInByEmail(userWith({}))).toBe(false);
  });
});

describe("classifyAccount", () => {
  const facts = {
    hasOwnerRow: false,
    hasProfile: false,
    signedInByEmail: true,
  };

  it("calls an account with an owners row an owner", () => {
    expect(classifyAccount({ ...facts, hasOwnerRow: true })).toBe("owner");
  });

  it("calls an account with a profile a customer, however it signed in", () => {
    expect(classifyAccount({ ...facts, hasProfile: true })).toBe("customer");
    expect(
      classifyAccount({ ...facts, hasProfile: true, signedInByEmail: false }),
    ).toBe("customer");
  });

  it("keeps an owner who somehow also has a profile on their board", () => {
    expect(
      classifyAccount({ ...facts, hasOwnerRow: true, hasProfile: true }),
    ).toBe("owner");
  });

  it("leaves an email sign-in with neither row undecided", () => {
    expect(classifyAccount(facts)).toBe("new");
  });

  it("calls a Google sign-in with neither row a customer", () => {
    expect(classifyAccount({ ...facts, signedInByEmail: false })).toBe(
      "customer",
    );
  });
});

describe("signedInLoginDestination", () => {
  it("sends an owner to their board", () => {
    expect(signedInLoginDestination("owner")).toBe("/admin");
  });

  it("sends an email account with no board yet on to set one up", () => {
    expect(signedInLoginDestination("new")).toBe("/setup");
  });

  it("shows a customer the sign-in form instead of bouncing them", () => {
    expect(signedInLoginDestination("customer")).toBeNull();
  });
});

describe("canSetUpBoard", () => {
  it.each<[AccountKind, boolean]>([
    ["owner", true],
    ["new", true],
    ["customer", false],
  ])("%s: %s", (kind, allowed) => {
    expect(canSetUpBoard(kind)).toBe(allowed);
  });
});

type Lookup = { data: object | null; error: { message: string } | null };

/** A client whose `owners` and `profiles` lookups return what's given. */
const clientReturning = (tables: { owners: Lookup; profiles: Lookup }) =>
  ({
    from: (table: "owners" | "profiles") => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => tables[table] }),
      }),
    }),
  }) as unknown as SupabaseClient;

const none: Lookup = { data: null, error: null };

describe("getAccount", () => {
  it("finds an owner by their owners row", async () => {
    const admin = clientReturning({
      owners: { data: { id: "user-1" }, error: null },
      profiles: none,
    });
    await expect(getAccount(emailUser, admin)).resolves.toEqual({
      kind: "owner",
      username: null,
    });
  });

  it("finds a customer who signed in by email by their profile", async () => {
    const admin = clientReturning({
      owners: none,
      profiles: { data: { username: "Ahmad" }, error: null },
    });
    await expect(getAccount(emailUser, admin)).resolves.toEqual({
      kind: "customer",
      username: "Ahmad",
    });
  });

  it("treats a fresh email sign-in as new", async () => {
    const admin = clientReturning({ owners: none, profiles: none });
    await expect(getAccount(emailUser, admin)).resolves.toEqual({
      kind: "new",
      username: null,
    });
  });

  it("treats a fresh Google sign-in as a customer", async () => {
    const admin = clientReturning({ owners: none, profiles: none });
    await expect(getAccount(googleUser, admin)).resolves.toEqual({
      kind: "customer",
      username: null,
    });
  });

  it("throws when a lookup fails, rather than guessing", async () => {
    const admin = clientReturning({
      owners: { data: null, error: { message: "down" } },
      profiles: none,
    });
    await expect(getAccount(emailUser, admin)).rejects.toThrow(
      "Could not load owner: down",
    );

    const admin2 = clientReturning({
      owners: none,
      profiles: { data: null, error: { message: "down" } },
    });
    await expect(getAccount(emailUser, admin2)).rejects.toThrow(
      "Could not load profile: down",
    );
  });
});
