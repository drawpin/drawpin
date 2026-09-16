import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES } from "@/lib/tile-image";
import { postTileFormSchema } from "./schema";

const image = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });

const parse = (fields: Record<string, unknown>) =>
  postTileFormSchema.safeParse({ slug: "cafe-aaaa", image, ...fields });

describe("postTileFormSchema", () => {
  it("trims the name and caption", () => {
    const result = parse({ displayName: "  Ahmad ", caption: " hi there " });
    expect(result.data).toMatchObject({
      displayName: "Ahmad",
      caption: "hi there",
    });
  });

  it.each([undefined, null, "", "   "])(
    "treats %j as not provided",
    (value) => {
      const result = parse({ displayName: value, caption: value });
      expect(result.data).toMatchObject({ displayName: null, caption: null });
    },
  );

  it("caps the name at 40 and the caption at 80 characters", () => {
    expect(
      parse({ displayName: "a".repeat(40), caption: "b".repeat(80) }).success,
    ).toBe(true);
    expect(parse({ displayName: "a".repeat(41) }).success).toBe(false);
    expect(parse({ caption: "b".repeat(81) }).success).toBe(false);
  });

  it.each(["line\nbreak", "tab\there", `bell${String.fromCharCode(7)}`])(
    "rejects control characters in %j",
    (value) => {
      expect(parse({ caption: value }).success).toBe(false);
    },
  );

  it("keeps emoji and accents", () => {
    expect(parse({ displayName: "Zoë ☕" }).data?.displayName).toBe("Zoë ☕");
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
