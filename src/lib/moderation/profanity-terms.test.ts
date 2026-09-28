import { describe, expect, it } from "vitest";
import { defaultProfanityTerms, selectProfanityTerms } from "./profanity-terms";

/**
 * These use made-up entries in the source package's shape, never real
 * slurs — this repository is public. {@link defaultProfanityTerms} (the
 * real list) only gets a smoke test below.
 */
describe("selectProfanityTerms", () => {
  it("keeps entries at or above severity 3, regardless of category", () => {
    const terms = selectProfanityTerms([
      { id: "a", match: "fakeslur", severity: 3, tags: ["racial"] },
      { id: "b", match: "fakeswear", severity: 3, tags: ["general"] },
      { id: "c", match: "mildinsult", severity: 2, tags: ["racial"] },
      { id: "d", match: "untagged", severity: 4 },
    ]);

    expect(terms).toEqual([
      // Categories come from the tags: a slur is hateful, a swear or an
      // untagged term is language.
      { term: "fakeslur", exceptions: [], category: "hateful" },
      { term: "fakeswear", exceptions: [], category: "language" },
      { term: "untagged", exceptions: [], category: "language" },
    ]);
  });

  it("splits alternates and strips elongation markers", () => {
    const terms = selectProfanityTerms([
      {
        id: "a",
        match: "fu*keyslur|altspelling",
        severity: 3,
        tags: ["lgbtq"],
      },
    ]);

    expect(terms).toEqual([
      { term: "fukeyslur", exceptions: [], category: "hateful" },
      { term: "altspelling", exceptions: [], category: "hateful" },
    ]);
  });

  it("expands exceptions against every alternate", () => {
    const terms = selectProfanityTerms([
      {
        id: "a",
        match: "fakeslur|otherslur",
        severity: 3,
        tags: ["religious"],
        exceptions: ["harm*"],
      },
    ]);

    expect(terms).toEqual([
      {
        term: "fakeslur",
        exceptions: ["harmfakeslur", "harmotherslur"],
        category: "hateful",
      },
      {
        term: "otherslur",
        exceptions: ["harmfakeslur", "harmotherslur"],
        category: "hateful",
      },
    ]);
  });
});

describe("defaultProfanityTerms", () => {
  it("parses the real list into a non-empty, well-formed set", () => {
    const terms = defaultProfanityTerms();

    expect(terms.length).toBeGreaterThan(100);
    for (const entry of terms) {
      expect(typeof entry === "string" ? entry : entry.term).not.toBe("");
    }
  });

  it("is cached across calls", () => {
    expect(defaultProfanityTerms()).toBe(defaultProfanityTerms());
  });
});
