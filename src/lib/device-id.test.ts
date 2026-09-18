// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  hashFingerprint,
  hashIpAddress,
  nameTagFor,
  signDeviceId,
  verifyDeviceCookie,
} from "./device-id";

const secret = "test-secret-that-is-long-enough-000000";
const deviceId = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const otherDeviceId = "0b6f3f0e-2a8e-4b1a-9f55-4d9f0f6f2c11";

describe("device cookie", () => {
  it("round-trips a signed device id", () => {
    expect(verifyDeviceCookie(signDeviceId(deviceId, secret), secret)).toBe(
      deviceId,
    );
  });

  it("rejects a cookie signed with another secret", () => {
    const cookie = signDeviceId(deviceId, "some-other-secret-0000000000000000");
    expect(verifyDeviceCookie(cookie, secret)).toBeNull();
  });

  it("rejects a swapped device id", () => {
    const signature = signDeviceId(deviceId, secret).split(".")[1];
    expect(
      verifyDeviceCookie(`${otherDeviceId}.${signature}`, secret),
    ).toBeNull();
  });

  it.each([undefined, "", deviceId, `${deviceId}.`, "not-a-uuid.abc", "."])(
    "rejects malformed value %j",
    (value) => {
      expect(verifyDeviceCookie(value, secret)).toBeNull();
    },
  );
});

describe("nameTagFor", () => {
  it("is four digits", () => {
    expect(nameTagFor(deviceId, "Ahmad", secret)).toMatch(/^\d{4}$/);
  });

  it("is stable for the same device and name, ignoring case and spacing", () => {
    const tag = nameTagFor(deviceId, "Ahmad", secret);
    expect(nameTagFor(deviceId, "  ahmad ", secret)).toBe(tag);
    expect(nameTagFor(deviceId, "AHMAD", secret)).toBe(tag);
  });

  it("differs across devices and names", () => {
    const tags = new Set([
      nameTagFor(deviceId, "Ahmad", secret),
      nameTagFor(otherDeviceId, "Ahmad", secret),
      nameTagFor(deviceId, "Sam", secret),
    ]);
    expect(tags.size).toBe(3);
  });

  it("depends on the secret", () => {
    expect(nameTagFor(deviceId, "Ahmad", secret)).not.toBe(
      nameTagFor(deviceId, "Ahmad", "another-secret-000000000000000000"),
    );
  });
});

describe("hashFingerprint", () => {
  it("is stable for the same fingerprint and secret", () => {
    expect(hashFingerprint("visitor-1", secret)).toBe(
      hashFingerprint("visitor-1", secret),
    );
  });

  it("differs per fingerprint and per secret", () => {
    expect(hashFingerprint("visitor-1", secret)).not.toBe(
      hashFingerprint("visitor-2", secret),
    );
    expect(hashFingerprint("visitor-1", secret)).not.toBe(
      hashFingerprint("visitor-1", `${secret}-other`),
    );
  });

  it("never stores the fingerprint itself", () => {
    expect(hashFingerprint("visitor-1", secret)).not.toContain("visitor-1");
  });
});

describe("hashIpAddress", () => {
  it("is stable per address and differs per address", () => {
    expect(hashIpAddress("203.0.113.7", secret)).toBe(
      hashIpAddress("203.0.113.7", secret),
    );
    expect(hashIpAddress("203.0.113.7", secret)).not.toBe(
      hashIpAddress("203.0.113.8", secret),
    );
  });

  it("never stores the address itself", () => {
    expect(hashIpAddress("203.0.113.7", secret)).not.toContain("203.0.113.7");
  });

  it("doesn't reuse the fingerprint hash for the same string", () => {
    // Both are keyed with one secret, so the purpose has to keep them apart.
    expect(hashIpAddress("same-value", secret)).not.toBe(
      hashFingerprint("same-value", secret),
    );
  });
});
