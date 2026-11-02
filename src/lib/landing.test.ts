import { describe, expect, it } from "vitest";
import { landingFor } from "./landing";

describe("landingFor", () => {
  it("lands a signed-in account with a name on the hub", () => {
    expect(landingFor({ signedIn: true, hasUsername: true }, "hub")).toBe(
      "hub",
    );
  });

  it("gives everyone else the marketing home", () => {
    expect(landingFor({ signedIn: false, hasUsername: false }, "hub")).toBe(
      "marketing",
    );
    // Signed in, but no name picked yet: nobody to greet.
    expect(landingFor({ signedIn: true, hasUsername: false }, "hub")).toBe(
      "marketing",
    );
  });

  it("gives everyone the marketing home when the switch says so", () => {
    expect(landingFor({ signedIn: true, hasUsername: true }, "marketing")).toBe(
      "marketing",
    );
  });
});
