import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignInButton } from "./sign-in-sheet";

// Server Actions and Cloudflare's widget don't run in jsdom.
vi.mock("@/app/auth/sign-in", () => ({ signInWithGoogle: vi.fn() }));
vi.mock("@/app/auth/email-sign-in", () => ({
  sendEmailCode: vi.fn(),
  verifyEmailCode: vi.fn(),
}));
vi.mock("@/components/turnstile", () => ({ Turnstile: () => null }));
vi.mock("@/lib/fonts", () => ({ hand: { className: "hand" } }));

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
  act(() => root.render(<SignInButton>Sign in</SignInButton>));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
});

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("SignInButton and SignInSheet", () => {
  it("opens a dialog with Google and the emailed code, and returns to this page", () => {
    expect(document.querySelector("[role=dialog]")).toBeNull();

    click(container.querySelector("button")!);

    const dialog = document.querySelector("[role=dialog]")!;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain("Continue with Google");
    expect(dialog.querySelector("input[type=email]")).not.toBeNull();
    // The button waits for Turnstile before it offers to send.
    expect(dialog.textContent).toContain("Checking your browser");
    expect(
      dialog.querySelector<HTMLInputElement>("input[name=next]")?.value,
    ).toBe(`${location.pathname}${location.search}`);
  });

  it("closes on Escape", async () => {
    click(container.querySelector("button")!);
    expect(document.querySelector("[role=dialog]")).not.toBeNull();

    await act(async () => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(document.querySelector("[role=dialog]")).toBeNull();
  });

  it("lands on the code step when a code was sent a moment ago", () => {
    localStorage.setItem(
      "drawpin:email-code",
      JSON.stringify({ email: "a@example.com", sentAt: Date.now() }),
    );
    click(container.querySelector("button")!);

    const dialog = document.querySelector("[role=dialog]")!;
    expect(dialog.textContent).toContain("Type the code");
    expect(dialog.textContent).toContain("a@example.com");
  });
});
