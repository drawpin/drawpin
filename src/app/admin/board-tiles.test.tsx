import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type AdminTile, BoardTiles } from "./board-tiles";

// The real actions reach Supabase; these tests only look at the screen.
vi.mock("./actions", () => ({
  removeTileAction: vi.fn(async () => ({ status: "idle" })),
  blockAccountAction: vi.fn(async () => ({ status: "idle" })),
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

function render(tiles: AdminTile[]) {
  act(() => root.render(<BoardTiles tiles={tiles} />));
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
const byText = (text: string) =>
  buttons().find((button) => button.textContent === text);
const drawing = (index: number) =>
  container.querySelectorAll<HTMLButtonElement>("button[aria-expanded]")[index];

describe("BoardTiles", () => {
  it("says when there are no drawings", () => {
    render([]);
    expect(container.textContent).toBe("No drawings on the board this week.");
  });

  it("counts the drawings", () => {
    render([tile("1")]);
    expect(container.textContent).toContain("1 drawing");
    render([tile("1"), tile("2")]);
    expect(container.textContent).toContain("2 drawings");
  });

  it("offers Block account only for a drawing posted by an account", () => {
    render([tile("1"), tile("2", false)]);
    expect(buttons().filter((b) => b.textContent === "Remove")).toHaveLength(2);
    expect(
      buttons().filter((b) => b.textContent === "Block account"),
    ).toHaveLength(1);
  });

  it("opens one drawing's options at a time on a tap", () => {
    render([tile("1"), tile("2")]);
    act(() => drawing(0).click());
    expect(drawing(0).getAttribute("aria-expanded")).toBe("true");

    act(() => drawing(1).click());
    expect(drawing(0).getAttribute("aria-expanded")).toBe("false");
    expect(drawing(1).getAttribute("aria-expanded")).toBe("true");

    act(() => drawing(1).click());
    expect(drawing(1).getAttribute("aria-expanded")).toBe("false");
  });

  it("asks before removing, and puts focus back on Cancel", () => {
    render([tile("1")]);
    act(() => byText("Remove")!.click());
    expect(byText("Confirm")).toBeDefined();
    expect(byText("Remove")).toBeUndefined();
    expect(document.activeElement?.textContent).toBe("Cancel");

    act(() => byText("Cancel")!.click());
    expect(byText("Confirm")).toBeUndefined();
    expect(document.activeElement).toBe(drawing(0));
  });

  it("explains blocking before it blocks", () => {
    render([tile("1")]);
    act(() => byText("Block account")!.click());
    expect(container.textContent).toContain("Block Sam#0001?");
    expect(byText("Block")).toBeDefined();
  });
});
