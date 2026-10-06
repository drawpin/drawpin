import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyValue } from "./copy-value";

// Lets React's act() run outside a testing library.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<CopyValue value="12345678" name="code" />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const button = () => container.querySelector("button")!;
const status = () => container.querySelector('[role="status"]')!;

async function click() {
  await act(async () => button().click());
}

describe("CopyValue", () => {
  it("names what it copies", () => {
    expect(button().textContent).toBe("Copy code");
  });

  it("copies the value, says so, then goes back after 2 seconds", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await click();

    expect(writeText).toHaveBeenCalledWith("12345678");
    expect(button().textContent).toBe("Copied");
    expect(status().textContent).toBe("Copied the code.");

    act(() => vi.advanceTimersByTime(2000));
    expect(button().textContent).toBe("Copy code");
    expect(status().textContent).toBe("");
  });

  it("selects the value to copy by hand when the clipboard can't be used", async () => {
    vi.stubGlobal("navigator", {});

    await click();

    expect(window.getSelection()?.toString()).toBe("12345678");
    expect(status().textContent).toMatch(/selected: copy it from your/);
    expect(status().className).not.toContain("sr-only");
  });
});
