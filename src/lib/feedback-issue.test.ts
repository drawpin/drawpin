import { describe, expect, it } from "vitest";
import {
  DETAILS_MAX,
  ISSUES_URL,
  TITLE_MAX,
  feedbackIssueUrl,
} from "./feedback-issue";

/** The query of a built link, as a map. */
function query(url: string | null) {
  expect(url).not.toBeNull();
  const parsed = new URL(url as string);
  expect(`${parsed.origin}${parsed.pathname}`).toBe(ISSUES_URL);
  return parsed.searchParams;
}

describe("feedbackIssueUrl", () => {
  it("fills in the kind's template, a prefixed title and the details", () => {
    const params = query(
      feedbackIssueUrl({
        kind: "bug",
        title: "  The pen skips on iPad  ",
        details: "Fast strokes leave gaps.",
      }),
    );
    expect(params.get("template")).toBe("bug.md");
    expect(params.get("title")).toBe("[Bug] The pen skips on iPad");
    expect(params.get("body")).toContain("Fast strokes leave gaps.");
    expect(params.get("body")).toContain("DrawPin home page");
  });

  it("uses each kind's own template and prefix", () => {
    expect(
      query(
        feedbackIssueUrl({ kind: "idea", title: "Stickers", details: "" }),
      ).get("title"),
    ).toBe("[Idea] Stickers");
    const other = query(
      feedbackIssueUrl({ kind: "other", title: "Hello", details: "" }),
    );
    expect(other.get("template")).toBe("other.md");
    expect(other.get("title")).toBe("[Feedback] Hello");
  });

  it("says so when there are no details", () => {
    const params = query(
      feedbackIssueUrl({ kind: "idea", title: "Dark mode", details: "   " }),
    );
    expect(params.get("body")).toContain("_No details given._");
  });

  it("refuses a blank title", () => {
    expect(
      feedbackIssueUrl({ kind: "bug", title: "   ", details: "Something" }),
    ).toBeNull();
  });

  it("cuts over-long text to the limits", () => {
    const params = query(
      feedbackIssueUrl({
        kind: "other",
        title: "t".repeat(TITLE_MAX + 50),
        details: "d".repeat(DETAILS_MAX + 50),
      }),
    );
    expect(params.get("title")).toBe(`[Feedback] ${"t".repeat(TITLE_MAX)}`);
    expect(params.get("body")).toContain("d".repeat(DETAILS_MAX));
    expect(params.get("body")).not.toContain("d".repeat(DETAILS_MAX + 1));
  });
});
