// @vitest-environment node
import { describe, expect, it } from "vitest";
import { categoryForOpenAi, categoryForTags } from "./categories";

describe("categoryForTags", () => {
  it.each([
    [["racial"], "hateful"],
    [["lgbtq"], "hateful"],
    [["religious"], "hateful"],
    [["sexual"], "sexual"],
    [["general"], "language"],
    [["shock"], "language"],
    [undefined, "language"],
  ] as const)("reads %j as %s", (tags, category) => {
    expect(categoryForTags(tags)).toBe(category);
  });

  it("calls a sexual slur hateful rather than sexual", () => {
    expect(categoryForTags(["sexual", "lgbtq"])).toBe("hateful");
  });
});

describe("categoryForOpenAi", () => {
  it.each([
    [["hate"], "hateful"],
    [["hate/threatening"], "hateful"],
    [["harassment"], "hateful"],
    [["sexual/minors"], "sexual"],
    [["violence/graphic"], "violent"],
    [["self-harm/intent"], "violent"],
    [["illicit"], "violent"],
    [[], "language"],
  ] as const)("reads %j as %s", (categories, category) => {
    expect(categoryForOpenAi(categories)).toBe(category);
  });

  it("names the most serious when several trip", () => {
    expect(categoryForOpenAi(["violence", "sexual", "hate"])).toBe("hateful");
  });
});
