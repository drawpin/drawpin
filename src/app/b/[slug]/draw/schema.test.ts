import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES } from "@/lib/tile-image";
import { postTileFormSchema } from "./schema";

const image = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });

const parse = (fields: Record<string, unknown>) =>
  postTileFormSchema.safeParse({ slug: "cafe-aaaa", image, ...fields });

describe("postTileFormSchema", () => {
  it("trims the caption", () => {
    expect(parse({ caption: " hi there " }).data?.caption).toBe("hi there");
  });

  it.each([undefined, null, "", "   "])(
    "treats %j as not provided",
    (value) => {
      expect(parse({ caption: value }).data?.caption).toBeNull();
    },
  );

  it("caps the caption at 80 characters", () => {
    expect(parse({ caption: "b".repeat(80) }).success).toBe(true);
    expect(parse({ caption: "b".repeat(81) }).success).toBe(false);
  });

  it.each(["line\nbreak", "tab\there", `bell${String.fromCharCode(7)}`])(
    "rejects control characters in %j",
    (value) => {
      expect(parse({ caption: value }).success).toBe(false);
    },
  );

  it("keeps emoji and accents", () => {
    expect(parse({ caption: "Zoë ☕" }).data?.caption).toBe("Zoë ☕");
  });

  it("requires a non-empty image within the size limit", () => {
    expect(parse({ image: null }).success).toBe(false);
    expect(parse({ image: new Blob([]) }).success).toBe(false);
    expect(
      parse({ image: new Blob([new Uint8Array(MAX_UPLOAD_BYTES + 1)]) }).error
        ?.issues[0].message,
    ).toBe("Your drawing is too large to upload.");
  });
});
