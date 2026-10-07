import { describe, expect, it } from "vitest";
import { nameChanged } from "./name-changed";

describe("nameChanged", () => {
  it("is false for the saved name", () => {
    expect(nameChanged("Corner Coffee", "Corner Coffee")).toBe(false);
  });

  it("ignores spaces the save would drop", () => {
    expect(nameChanged("  Corner   Coffee ", "Corner Coffee")).toBe(false);
  });

  it("is true for a different name", () => {
    expect(nameChanged("Corner Cafe", "Corner Coffee")).toBe(true);
  });

  it("counts a change of case", () => {
    expect(nameChanged("corner coffee", "Corner Coffee")).toBe(true);
  });

  it("counts an emptied field, so the save can say why it's refused", () => {
    expect(nameChanged("   ", "Corner Coffee")).toBe(true);
  });
});
