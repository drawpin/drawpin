// @vitest-environment node
import { describe, expect, it } from "vitest";
import { loginHref, signInDestination } from "./sign-in-routing";

describe("signInDestination", () => {
  it("returns an account with a name to where it was", () => {
    expect(signInDestination({ next: "/b/cafe/draw", hasProfile: true })).toBe(
      "/b/cafe/draw",
    );
  });

  it("sends a first-time account through /welcome, carrying the page", () => {
    expect(
      signInDestination({ next: "/b/cafe/draw?x=1", hasProfile: false }),
    ).toBe("/welcome?next=%2Fb%2Fcafe%2Fdraw%3Fx%3D1");
  });

  it("lets an account without a name straight into the owner screens", () => {
    for (const next of ["/admin", "/setup", "/admin/my-board", "/admin?a=1"]) {
      expect(signInDestination({ next, hasProfile: false })).toBe(next);
    }
  });

  it("does not treat lookalike paths as owner screens", () => {
    expect(
      signInDestination({ next: "/administrator", hasProfile: false }),
    ).toBe("/welcome?next=%2Fadministrator");
  });

  it.each(["https://evil.example", "//evil.example", "javascript:alert(1)"])(
    "refuses %o and uses the fallback",
    (next) => {
      expect(signInDestination({ next, hasProfile: true })).toBe("/");
      expect(
        signInDestination({ next, hasProfile: true, fallback: "/me" }),
      ).toBe("/me");
    },
  );

  it("uses the fallback when there is no next", () => {
    expect(signInDestination({ next: null, hasProfile: true })).toBe("/");
    expect(signInDestination({ next: undefined, hasProfile: false })).toBe(
      "/welcome?next=%2F",
    );
  });
});

describe("loginHref", () => {
  it("carries a safe next", () => {
    expect(loginHref("/admin")).toBe("/login?next=%2Fadmin");
  });

  it("drops one that would leave the site", () => {
    expect(loginHref("//evil.example")).toBe("/login");
    expect(loginHref(null)).toBe("/login");
    expect(loginHref()).toBe("/login");
  });
});
