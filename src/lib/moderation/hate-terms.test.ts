import { describe, expect, it } from "vitest";
import { defaultHateTerms, selectHateTerms } from "./hate-terms";

/**
 * These use made-up entries in the source package's shape, never real
 * slurs — this repository is public. {@link defaultHateTerms} (the real
 * list) only gets a smoke test below.
 */
describe("selectHateTerms", () => {
  it("keeps hate-tagged entries at or above severity 3", () => {
    const terms = selectHateTerms([
      { id: "a", match: "fakeslur", severity: 3, tags: ["racial"] },
      { id: "b", match: "mildinsult", severity: 2, tags: ["racial"] },
      { id: "c", match: "sweardword", severity: 4, tags: ["general"] },
    ]);

    expect(terms).toEqual([{ term: "fakeslur", exceptions: [] }]);
  });

  it("splits alternates and strips elongation markers", () => {
    const terms = selectHateTerms([
      {
        id: "a",
        match: "fu*keyslur|altspelling",
        severity: 3,
        tags: ["lgbtq"],
      },
    ]);

    expect(terms).toEqual([
      { term: "fukeyslur", exceptions: [] },
      { term: "altspelling", exceptions: [] },
    ]);
  });

  it("expands exceptions against every alternate", () => {
    const terms = selectHateTerms([
      {
        id: "a",
        match: "fakeslur|otherslur",
        severity: 3,
        tags: ["religious"],
        exceptions: ["harm*"],
      },
    ]);

    expect(terms).toEqual([
      { term: "fakeslur", exceptions: ["harmfakeslur", "harmotherslur"] },
      { term: "otherslur", exceptions: ["harmfakeslur", "harmotherslur"] },
    ]);
  });

  it("ignores an entry with no hate tag, even at severity 4", () => {
    expect(
      selectHateTerms([
        { id: "a", match: "sweardword", severity: 4, tags: ["sexual"] },
        { id: "b", match: "untagged", severity: 4 },
      ]),
    ).toEqual([]);
  });
});

describe("defaultHateTerms", () => {
  it("parses the real list into a non-empty, well-formed set", () => {
    const terms = defaultHateTerms();

    expect(terms.length).toBeGreaterThan(20);
    for (const entry of terms) {
      expect(typeof entry === "string" ? entry : entry.term).not.toBe("");
    }
  });

  it("is cached across calls", () => {
    expect(defaultHateTerms()).toBe(defaultHateTerms());
  });
});
