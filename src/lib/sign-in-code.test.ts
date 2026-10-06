import { describe, expect, it } from "vitest";
import { codeDigits, findCode } from "./sign-in-code";

describe("findCode", () => {
  it.each([
    ["12345678", "12345678"],
    ["1234 5678", "12345678"],
    ["1234-5678", "12345678"],
    ["  123456\n", "123456"],
    ["Your DrawPin sign-in code is 48213907.", "48213907"],
    ["Code 482139, expires in 15 minutes", "482139"],
  ])("finds the code in %j", (text, code) => {
    expect(findCode(text)).toBe(code);
  });

  it.each(["5", "12 34", "abc", "123456789012345"])(
    "finds no code in %j",
    (text) => {
      expect(findCode(text)).toBeNull();
    },
  );
});

describe("codeDigits", () => {
  it("keeps only digits", () => {
    expect(codeDigits("12a3")).toBe("123");
    expect(codeDigits("1234 - 5678")).toBe("12345678");
  });

  it("never keeps more digits than a code can have", () => {
    expect(codeDigits("123456789012345")).toBe("1234567890");
  });
});
