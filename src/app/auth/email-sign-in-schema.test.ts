import { describe, expect, it } from "vitest";
import { codeSchema, emailSchema } from "./email-sign-in-schema";

describe("emailSchema", () => {
  it("lowercases an address", () => {
    expect(emailSchema.parse("Maya@Example.com")).toBe("maya@example.com");
  });

  it("refuses something that isn't an address", () => {
    expect(emailSchema.safeParse("maya@").success).toBe(false);
  });
});

describe("codeSchema", () => {
  it("accepts the code at the project's length, with or without spaces", () => {
    expect(codeSchema.parse("123456")).toBe("123456");
    expect(codeSchema.parse("123 456")).toBe("123456");
    expect(codeSchema.parse("1234 5678")).toBe("12345678");
  });

  it.each(["12345", "12345678901", "12a456", ""])("refuses %j", (code) => {
    expect(codeSchema.safeParse(code).success).toBe(false);
  });
});
