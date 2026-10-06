import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PENDING_CODE_MS,
  clearPendingEmail,
  readPendingEmail,
  savePendingEmail,
} from "./pending-email-code";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("pending email code", () => {
  it("remembers the address a code was sent to", () => {
    savePendingEmail("ana@example.com", "customer", 1_000);
    expect(readPendingEmail("customer", 1_000 + 60_000)).toBe(
      "ana@example.com",
    );
  });

  it("forgets it once the code would have expired", () => {
    savePendingEmail("ana@example.com", "customer", 1_000);
    expect(readPendingEmail("customer", 1_000 + PENDING_CODE_MS)).toBeNull();
  });

  it("ignores a time in the future", () => {
    savePendingEmail("ana@example.com", "customer", 10_000);
    expect(readPendingEmail("customer", 5_000)).toBeNull();
  });

  it("forgets it when cleared", () => {
    savePendingEmail("ana@example.com", "customer", 1_000);
    clearPendingEmail();
    expect(readPendingEmail("customer", 2_000)).toBeNull();
  });

  it("keeps an owner's code apart from a player's", () => {
    savePendingEmail("owner@example.com", "owner", 1_000);
    expect(readPendingEmail("customer", 2_000)).toBeNull();
    expect(readPendingEmail("owner", 2_000)).toBe("owner@example.com");
    clearPendingEmail("customer");
    expect(readPendingEmail("owner", 2_000)).toBe("owner@example.com");
  });

  it("treats junk in storage as nothing pending", () => {
    localStorage.setItem("drawpin:email-code", "not json");
    expect(readPendingEmail()).toBeNull();
    localStorage.setItem("drawpin:email-code", JSON.stringify({ email: 1 }));
    expect(readPendingEmail()).toBeNull();
  });

  it("fails quietly when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => savePendingEmail("ana@example.com")).not.toThrow();
    expect(readPendingEmail()).toBeNull();
  });
});
