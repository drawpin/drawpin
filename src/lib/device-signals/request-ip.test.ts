import { describe, expect, it } from "vitest";
import { clientIpFrom } from "./request-ip";

const headersWith = (values: Record<string, string>) => new Headers(values);

describe("clientIpFrom", () => {
  it("prefers the address the proxy set", () => {
    const headers = headersWith({
      "x-real-ip": "203.0.113.7",
      "x-forwarded-for": "198.51.100.9, 203.0.113.7",
    });

    expect(clientIpFrom(headers)).toBe("203.0.113.7");
  });

  it("falls back to the first hop of the forwarded chain", () => {
    const headers = headersWith({
      "x-forwarded-for": "198.51.100.9, 10.0.0.1",
    });

    expect(clientIpFrom(headers)).toBe("198.51.100.9");
  });

  it("trims surrounding whitespace", () => {
    expect(clientIpFrom(headersWith({ "x-real-ip": " 203.0.113.7 " }))).toBe(
      "203.0.113.7",
    );
  });

  it("returns null when no proxy set one", () => {
    expect(clientIpFrom(headersWith({}))).toBeNull();
  });

  it("returns null for an empty header", () => {
    expect(clientIpFrom(headersWith({ "x-forwarded-for": " " }))).toBeNull();
  });
});
