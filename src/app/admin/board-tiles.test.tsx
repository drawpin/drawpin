import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoardTiles } from "./board-tiles";
import type { AdminTile, ReportedTile } from "./drawings";

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

const reported = (id: string): ReportedTile => ({
  ...tile(id),
  reportCount: 2,
  reasons: ["spam", "other"],
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
  vi.unstubAllGlobals();
});

const buttons = () => Array.from(container.querySelectorAll("button"));
const allByText = (text: string) =>
  buttons().filter((button) => button.textContent === text);
const byText = (text: string) => allByText(text)[0];
const drawing = (index: number) =>
  container.querySelectorAll<HTMLButtonElement>("button[aria-expanded]")[index];
const tab = (name: string) =>
  Array.from(container.querySelectorAll<HTMLElement>("[role=tab]")).find(
    (element) => element.textContent?.startsWith(name),
  )!;

describe("BoardTiles", () => {
  it("says when there are no drawings", () => {
    render(<BoardTiles tiles={[]} reported={[]} />);
    expect(container.textContent).toContain(
      "No drawings on the board this week.",
    );
    expect(container.querySelector("[role=tablist]")).toBeNull();
  });

  it("counts the drawings", () => {
    render(<BoardTiles tiles={[tile("1")]} reported={[]} />);
    expect(container.textContent).toContain("1 drawing");
    render(<BoardTiles tiles={[tile("1"), tile("2")]} reported={[]} />);
    expect(container.textContent).toContain("2 drawings");
  });

  it("offers Block account only for a drawing posted by an account", () => {
    render(<BoardTiles tiles={[tile("1"), tile("2", false)]} reported={[]} />);
    expect(allByText("Remove")).toHaveLength(2);
    expect(allByText("Block account")).toHaveLength(1);
    expect(allByText("Keep it")).toHaveLength(0);
  });

  it("opens one drawing's options at a time on a tap", () => {
    render(<BoardTiles tiles={[tile("1"), tile("2")]} reported={[]} />);
    act(() => drawing(0).click());
    expect(drawing(0).getAttribute("aria-expanded")).toBe("true");

    act(() => drawing(1).click());
    expect(drawing(0).getAttribute("aria-expanded")).toBe("false");
    expect(drawing(1).getAttribute("aria-expanded")).toBe("true");

    act(() => drawing(1).click());
    expect(drawing(1).getAttribute("aria-expanded")).toBe("false");
  });

  it("asks before removing, on the drawing, then puts focus back", () => {
    render(<BoardTiles tiles={[tile("1")]} reported={[]} />);
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
    render(<BoardTiles tiles={[tile("1")]} reported={[]} />);
    act(() => byText("Block account")!.click());
    expect(container.textContent).toContain(
      "Block Sam#0001? They can't post, vote or report here, and their drawings are removed.",
    );
    expect(byText("Block")).toBeDefined();
  });
});

describe("BoardTiles with reports", () => {
  it("says how many are reported and offers the filter", () => {
    render(
      <BoardTiles tiles={[tile("1"), tile("2")]} reported={[reported("2")]} />,
    );
    expect(container.textContent).toContain("1 drawing reported.");
    expect(tab("All").textContent).toBe("All2");
    expect(tab("Reported").textContent).toBe("Reported1");
    expect(tab("All").getAttribute("aria-selected")).toBe("true");
  });

  it("flags a reported drawing among the rest and says why", () => {
    render(
      <BoardTiles tiles={[tile("1"), tile("2")]} reported={[reported("2")]} />,
    );
    expect(container.textContent).toContain("2 reports: spam, something else");
    // Keep it, which clears the reports, only on the reported one.
    expect(allByText("Keep it")).toHaveLength(1);
    expect(byText("Keep it")?.getAttribute("type")).toBe("submit");
  });

  it("shows only the reported ones under Reported, earlier weeks' too", () => {
    render(
      <BoardTiles
        tiles={[tile("1"), tile("2")]}
        reported={[reported("9"), reported("2")]}
      />,
    );
    act(() => tab("Reported").click());
    expect(tab("Reported").getAttribute("aria-selected")).toBe("true");
    expect(allByText("Remove")).toHaveLength(2);
    expect(container.textContent).toContain("Sam#0009 · From an earlier week");
    expect(container.textContent).not.toContain("Sam#0001");
  });

  it("switches to Reported from the line above the drawings", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    render(<BoardTiles tiles={[tile("1")]} reported={[reported("1")]} />);
    act(() => byText("See them")!.click());
    expect(tab("Reported").getAttribute("aria-selected")).toBe("true");
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("moves between the views with the arrow keys", () => {
    render(<BoardTiles tiles={[tile("1")]} reported={[reported("1")]} />);
    act(() => {
      tab("All").dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });
    expect(tab("Reported").getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tab("Reported"));
  });
});
