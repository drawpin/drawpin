import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type AdminTile, BoardTiles } from "./board-tiles";
import { type ReportedAdminTile, ReportedTiles } from "./reported-tiles";

// The real actions reach Supabase; these tests only look at the screen.
vi.mock("./actions", () => ({
  removeTileAction: vi.fn(async () => ({ status: "idle" })),
  blockAccountAction: vi.fn(async () => ({ status: "idle" })),
  dismissReportsAction: vi.fn(async () => ({ status: "idle" })),
}));

// Lets React's act() run outside a testing library.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const tile = (id: string, canBlock = true): AdminTile => ({
  id,
  author: `Sam#${id.padStart(4, "0")}`,
  canBlock,
  caption: null,
  imageUrl: `https://example.test/${id}.png`,
});

let container: HTMLDivElement;
let root: Root;

function render(element: React.ReactNode) {
  act(() => root.render(element));
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const buttons = () => Array.from(container.querySelectorAll("button"));
const allByText = (text: string) =>
  buttons().filter((button) => button.textContent === text);
const byText = (text: string) => allByText(text)[0];
const drawing = (index: number) =>
  container.querySelectorAll<HTMLButtonElement>("button[aria-expanded]")[index];

describe("BoardTiles", () => {
  it("says when there are no drawings", () => {
    render(<BoardTiles tiles={[]} />);
    expect(container.textContent).toBe("No drawings on the board this week.");
  });

  it("counts the drawings", () => {
    render(<BoardTiles tiles={[tile("1")]} />);
    expect(container.textContent).toContain("1 drawing");
    render(<BoardTiles tiles={[tile("1"), tile("2")]} />);
    expect(container.textContent).toContain("2 drawings");
  });

  it("offers Block account only for a drawing posted by an account", () => {
    render(<BoardTiles tiles={[tile("1"), tile("2", false)]} />);
    expect(allByText("Remove")).toHaveLength(2);
    expect(allByText("Block account")).toHaveLength(1);
    expect(allByText("Keep it")).toHaveLength(0);
  });

  it("opens one drawing's options at a time on a tap", () => {
    render(<BoardTiles tiles={[tile("1"), tile("2")]} />);
    act(() => drawing(0).click());
    expect(drawing(0).getAttribute("aria-expanded")).toBe("true");

    act(() => drawing(1).click());
    expect(drawing(0).getAttribute("aria-expanded")).toBe("false");
    expect(drawing(1).getAttribute("aria-expanded")).toBe("true");

    act(() => drawing(1).click());
    expect(drawing(1).getAttribute("aria-expanded")).toBe("false");
  });

  it("asks before removing, on the drawing, then puts focus back", () => {
    render(<BoardTiles tiles={[tile("1")]} />);
    act(() => byText("Remove")!.click());
    expect(container.textContent).toContain("Remove this drawing?");
    expect(byText("Block account")).toBeUndefined();
    // The question keeps the options showing while it's open.
    expect(drawing(0).getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement?.textContent).toBe("Cancel");

    act(() => byText("Cancel")!.click());
    expect(container.textContent).not.toContain("Remove this drawing?");
    expect(document.activeElement).toBe(drawing(0));
  });

  it("says what blocking does before it blocks", () => {
    render(<BoardTiles tiles={[tile("1")]} />);
    act(() => byText("Block account")!.click());
    expect(container.textContent).toContain(
      "Block Sam#0001? They can't post, vote or report here, and their drawings are removed.",
    );
    expect(byText("Block")).toBeDefined();
  });
});

describe("ReportedTiles", () => {
  const reported = (id: string): ReportedAdminTile => ({
    ...tile(id),
    reportCount: 2,
    reasons: ["spam", "other"],
  });

  it("shows nothing when there are no reports", () => {
    render(<ReportedTiles tiles={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("counts them and says why each was reported", () => {
    render(<ReportedTiles tiles={[reported("1"), reported("2")]} />);
    expect(container.textContent).toContain("2 reported");
    expect(container.textContent).toContain(
      "Sam#0001 · 2 reports: spam, something else",
    );
  });

  it("offers Keep it alongside Remove and Block account", () => {
    render(<ReportedTiles tiles={[reported("1")]} />);
    expect(byText("Remove")).toBeDefined();
    expect(byText("Block account")).toBeDefined();
    expect(byText("Keep it")?.getAttribute("type")).toBe("submit");
  });
});
