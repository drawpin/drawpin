import { describe, expect, it } from "vitest";
import { historyShortcut, isTypingTarget } from "./shortcuts";

/** A key press with no modifiers, overridden per test. */
function press(key: string, modifiers: Partial<KeyboardEvent> = {}) {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...modifiers,
  };
}

describe("historyShortcut", () => {
  it("undoes on Ctrl+Z and Cmd+Z", () => {
    expect(historyShortcut(press("z", { ctrlKey: true }))).toBe("undo");
    expect(historyShortcut(press("z", { metaKey: true }))).toBe("undo");
  });

  it("redoes on Ctrl+Shift+Z and Ctrl+Y", () => {
    // Shift turns the key into a capital Z on most keyboards.
    expect(historyShortcut(press("Z", { ctrlKey: true, shiftKey: true }))).toBe(
      "redo",
    );
    expect(historyShortcut(press("y", { ctrlKey: true }))).toBe("redo");
  });

  it("ignores Z without Ctrl or Cmd", () => {
    expect(historyShortcut(press("z"))).toBeNull();
  });

  it("ignores other Ctrl shortcuts", () => {
    expect(historyShortcut(press("c", { ctrlKey: true }))).toBeNull();
  });
});

describe("isTypingTarget", () => {
  function input(type: string) {
    const element = document.createElement("input");
    element.type = type;
    return element;
  }

  it("counts text fields, so Ctrl+Z there undoes the typing", () => {
    expect(isTypingTarget(input("text"))).toBe(true);
    expect(isTypingTarget(document.createElement("textarea"))).toBe(true);
  });

  it("doesn't count the size slider, which takes focus when opened", () => {
    expect(isTypingTarget(input("range"))).toBe(false);
  });

  it("doesn't count the colour picker or a button", () => {
    expect(isTypingTarget(input("color"))).toBe(false);
    expect(isTypingTarget(document.createElement("button"))).toBe(false);
  });

  it("doesn't count the page itself", () => {
    expect(isTypingTarget(document.body)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
