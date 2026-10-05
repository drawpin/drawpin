import { describe, expect, it, vi } from "vitest";
import {
  deletionDate,
  type DownloadDeps,
  downloadName,
  prepareDownload,
} from "./my-drawings";

describe("deletionDate", () => {
  it("is 30 days after the week's voting ends", () => {
    expect(deletionDate("2026-10-12T09:00:00Z").toISOString()).toBe(
      "2026-11-11T09:00:00.000Z",
    );
  });
});

describe("downloadName", () => {
  it("names the board and the day it was posted", () => {
    expect(
      downloadName("maple-street-k7m2", "2026-10-01T18:30:00.123+00:00"),
    ).toBe("drawpin-maple-street-k7m2-2026-10-01.png");
  });
});

describe("prepareDownload", () => {
  const deps = (): DownloadDeps => ({
    findOwnTile: vi.fn(async (tileId: string, userId: string) =>
      tileId === "mine" && userId === "user-1"
        ? {
            imagePath: "v/w/mine.webp",
            boardSlug: "maple-street-k7m2",
            postedAt: "2026-10-01T18:30:00Z",
          }
        : null,
    ),
    readImage: vi.fn(async () => Buffer.from("webp")),
    toPng: vi.fn(async () => Buffer.from("png")),
  });

  it("returns the account's own drawing as a named PNG", async () => {
    const d = deps();

    expect(await prepareDownload("mine", "user-1", d)).toEqual({
      file: Buffer.from("png"),
      name: "drawpin-maple-street-k7m2-2026-10-01.png",
    });
    expect(d.readImage).toHaveBeenCalledWith("v/w/mine.webp");
  });

  it("finds nothing for someone else's drawing, without reading it", async () => {
    const d = deps();

    expect(await prepareDownload("mine", "user-2", d)).toBeNull();
    expect(d.readImage).not.toHaveBeenCalled();
  });
});
