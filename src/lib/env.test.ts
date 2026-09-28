// @vitest-environment node
import { describe, expect, it } from "vitest";
import { siteUrlFor } from "./env";

const SITE_URL = "https://drawpin.io";

describe("siteUrlFor", () => {
  it("uses SITE_URL in production", () => {
    expect(
      siteUrlFor({
        SITE_URL,
        VERCEL_ENV: "production",
        VERCEL_BRANCH_URL: "drawpin-git-main-team.vercel.app",
      }),
    ).toBe(SITE_URL);
  });

  it("uses a preview's own branch address", () => {
    expect(
      siteUrlFor({
        SITE_URL,
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL: "drawpin-git-fix-thing-team.vercel.app",
      }),
    ).toBe("https://drawpin-git-fix-thing-team.vercel.app");
  });

  it("falls back to SITE_URL off Vercel", () => {
    expect(siteUrlFor({ SITE_URL: "http://localhost:3000" })).toBe(
      "http://localhost:3000",
    );
  });
});
