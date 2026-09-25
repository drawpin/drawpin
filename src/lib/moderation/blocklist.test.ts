import { describe, expect, it } from "vitest";
import {
  findBlockedTerm,
  normalizeForBlocklist,
  parseBlocklist,
} from "./blocklist";
import { defaultProfanityTerms } from "./profanity-terms";

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
    expect(findBlockedTerm(text, [])).toEqual({
      term: expected,
      category: "contact",
    });
  });

  it("blocks configured terms, including disguised spellings", () => {
    const terms = parseBlocklist("badword, two words");
    expect(findBlockedTerm("this is a badword", terms)).toMatchObject({
      term: "badword",
    });
    expect(findBlockedTerm("B4DW0RD!", terms)).toMatchObject({
      term: "badword",
    });
    expect(findBlockedTerm("xxbadwordxx", terms)).toMatchObject({
      term: "badword",
    });
    expect(findBlockedTerm("say two words here", terms)).toMatchObject({
      term: "two words",
    });
  });

  it("doesn't let a short term match inside an unrelated word", () => {
    expect(findBlockedTerm("classic", parseBlocklist("ass"))).toBeNull();
    expect(findBlockedTerm("ass", parseBlocklist("ass"))).toMatchObject({
      term: "ass",
    });
  });

  it("exempts a term's known-innocent phrases", () => {
    const term = { term: "arse", exceptions: ["sparse"] };
    expect(findBlockedTerm("the data is sparse", [term])).toBeNull();
    expect(findBlockedTerm("what an arse", [term])).toMatchObject({
      term: "arse",
    });
  });
});

describe("findBlockedTerm: disguised spellings", () => {
  const terms = parseBlocklist("badword, darn");

  it.each([
    ["spaced out", "b a d w o r d"],
    ["dotted", "b.a.d.w.o.r.d"],
    ["stretched", "baaaadword"],
    ["stretched on a double letter", "darrrrn"],
    ["in Cyrillic look-alikes", "bаdwоrd"],
    ["in Greek look-alikes", "bαdwοrd"],
  ])("catches a word %s", (_how, text) => {
    expect(findBlockedTerm(text, terms)).not.toBeNull();
  });

  it("reads ph as f", () => {
    expect(findBlockedTerm("phudge", parseBlocklist("fudge"))).toMatchObject({
      term: "fudge",
    });
  });

  it("leaves a single short gap alone", () => {
    // "a b" is two letters, not a word spelled out.
    expect(findBlockedTerm("plan a b", parseBlocklist("ab"))).toBeNull();
  });
});

describe("findBlockedTerm: with the real list", () => {
  const terms = defaultProfanityTerms();

  it.each(["f u c k", "f.u.c.k", "fuuuuck", "phuck", "fuсk"])(
    "catches %j",
    (text) => {
      expect(findBlockedTerm(text, terms)).not.toBeNull();
    },
  );

  // One letter away from a swear, or a swear hidden inside an ordinary
  // word: every one of these has to keep getting through.
  it.each([
    "Scunthorpe",
    "class assignment",
    "cocktail",
    "bigger",
    "where",
    "pitch",
    "ditch",
    "birch",
    "as good as it gets",
    "passing the photograph",
    "soooo cool",
    "yesss",
    "hmmm",
    "USA",
    "Essex",
    "Sussex",
    "Dickens",
    "assessment",
    "grape",
    "drape",
    "scrape",
    "trapeze",
    "specialist",
    "specialists",
    "Pakistan",
    "therapist",
    "therapeutic",
    "Blue Bottle",
  ])("lets %j through", (text) => {
    expect(findBlockedTerm(text, terms)).toBeNull();
  });
});

describe("findBlockedTerm: categories", () => {
  it("calls a link, an email or a phone number contact", () => {
    expect(findBlockedTerm("call 555 867 5309", [])?.category).toBe("contact");
  });

  it("calls a plain configured term language", () => {
    expect(findBlockedTerm("badword", ["badword"])?.category).toBe("language");
  });

  it("keeps a term's own category", () => {
    expect(
      findBlockedTerm("zzslur", [{ term: "zzslur", category: "hateful" }])
        ?.category,
    ).toBe("hateful");
  });
});
