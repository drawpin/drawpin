import { describe, expect, it } from "vitest";
import { config } from "./proxy";

// Next anchors a matcher like a full-path regex; mirror that here.
const matcher = new RegExp(`^${config.matcher[0]}$`);

describe("proxy matcher", () => {
  it.each([
    "/",
    "/b/abc",
    "/b/abc/draw",
    "/b/abc/vote",
    "/welcome",
    "/account",
  ])("refreshes the session on %s", (path) => {
    expect(matcher.test(path)).toBe(true);
  });

  it.each([
    "/_next/static/x.js",
    "/_next/image",
    "/favicon.ico",
    "/examples/dog.webp",
    "/api/cron/cleanup",
    "/api/health",
  ])("skips %s", (path) => {
    expect(matcher.test(path)).toBe(false);
  });
});
