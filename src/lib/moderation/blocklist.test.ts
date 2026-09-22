import { describe, expect, it } from "vitest";
import {
  findBlockedTerm,
  normalizeForBlocklist,
  parseBlocklist,
} from "./blocklist";

describe("normalizeForBlocklist", () => {
  it("lowercases, strips accents, and undoes letter/number swaps", () => {
    expect(normalizeForBlocklist("Bád W0rd")).toBe("bad word");
    expect(normalizeForBlocklist("SP@M-5ITE")).toBe("spam site");
  });
});

describe("parseBlocklist", () => {
  it("splits and normalizes a comma-separated list", () => {
    expect(parseBlocklist(" Foo , BÁR ,, ")).toEqual(["foo", "bar"]);
  });

  it("returns nothing when unset", () => {
    expect(parseBlocklist(undefined)).toEqual([]);
    expect(parseBlocklist("")).toEqual([]);
  });
});

describe("findBlockedTerm", () => {
  it("allows ordinary captions and names", () => {
    for (const text of ["Blue Bottle", "my cat ☕", "Ahmad", "10/10 coffee"]) {
      expect(findBlockedTerm(text, ["banned"])).toBeNull();
    }
  });

  it("ignores missing text", () => {
    expect(findBlockedTerm(null, ["banned"])).toBeNull();
  });

  it.each([
    ["https://spam.example", "link"],
    ["visit www.spam.co", "link"],
    ["check spam.shop now", "link"],
    ["mail me at a@b.com", "email address"],
    ["call 555 867 5309", "phone number"],
    ["+1 (555) 867-5309", "phone number"],
  ])("blocks spam in %j", (text, expected) => {
    expect(findBlockedTerm(text, [])).toEqual({ term: expected });
  });

  it("blocks configured terms, including disguised spellings", () => {
    const terms = parseBlocklist("badword, two words");
    expect(findBlockedTerm("this is a badword", terms)).toEqual({
      term: "badword",
    });
    expect(findBlockedTerm("B4DW0RD!", terms)).toEqual({ term: "badword" });
    expect(findBlockedTerm("xxbadwordxx", terms)).toEqual({ term: "badword" });
    expect(findBlockedTerm("say two words here", terms)).toEqual({
      term: "two words",
    });
  });

  it("doesn't let a short term match inside an unrelated word", () => {
    expect(findBlockedTerm("classic", parseBlocklist("ass"))).toBeNull();
    expect(findBlockedTerm("ass", parseBlocklist("ass"))).toEqual({
      term: "ass",
    });
  });

  it("exempts a term's known-innocent phrases", () => {
    const term = { term: "arse", exceptions: ["sparse"] };
    expect(findBlockedTerm("the data is sparse", [term])).toBeNull();
    expect(findBlockedTerm("what an arse", [term])).toEqual({ term: "arse" });
  });
});
