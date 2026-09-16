import { describe, expect, it } from "vitest";
import { loginSchema } from "./schema";

describe("loginSchema", () => {
  it("normalises the email address", () => {
    expect(loginSchema.parse({ email: "  Owner@Example.COM " })).toEqual({
      email: "owner@example.com",
    });
  });

  it("rejects something that isn't an email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Enter a valid email address.",
    );
  });

  it("rejects a missing email", () => {
    expect(loginSchema.safeParse({ email: null }).success).toBe(false);
  });
});
