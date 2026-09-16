import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("drops falsy values and joins the rest", () => {
    expect(cn("px-2", false && "hidden", undefined, "text-sm")).toBe(
      "px-2 text-sm",
    );
  });

  it("resolves conflicting Tailwind classes in favor of the last one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
