// @vitest-environment node
import { describe, expect, it } from "vitest";
import { nameTagFor, signDeviceId, verifyDeviceCookie } from "./device-id";

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
