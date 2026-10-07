import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Board } from "../data";
import { LATE_NIGHT_COOKIE } from "./consent";

const jar = new Map<string, string>();
const set = vi.fn<(name: string, value: string, options?: object) => void>(
  (name, value) => {
    jar.set(name, value);
  },
);
// The warning's card uses the handwriting font, which needs Next's loader.
vi.mock("@/lib/fonts", () => ({ hand: { className: "" } }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name) } : undefined,
    set,
  }),
}));

class Redirect extends Error {}
class NotFound extends Error {}
const redirect = vi.fn((to: string) => {
  throw new Redirect(to);
});
vi.mock("next/navigation", () => ({
  redirect,
  notFound: () => {
    throw new NotFound();
  },
}));

const getBoard = vi.fn();
vi.mock("../data", () => ({ getBoard }));

const { continueToBoard } = await import("./actions");
const { lateNightGate } = await import("./gate");

const board: Board = {
  id: "5d1c0b8e-6a3f-4c2e-8f1d-2b7a9c4e6f10",
  name: "Night Owls",
  slug: "night-owls-k7m2",
  timezone: "UTC",
  clock: { timeZone: "UTC", change: null },
  isPaused: false,
  moderationLevel: "late_night",
};

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  jar.clear();
  set.mockClear();
  redirect.mockClear();
  getBoard.mockReset();
});

describe("lateNightGate", () => {
  it.each(["all_ages", "standard"] as const)(
    "lets a %s board through",
    async (moderationLevel) => {
      await expect(
        lateNightGate({ ...board, moderationLevel }, ""),
      ).resolves.toBeNull();
    },
  );

  it("warns before a Late Night board on the first visit", async () => {
    await expect(lateNightGate(board, "")).resolves.not.toBeNull();
  });

  it("lets the board through once this device has continued", async () => {
    jar.set(LATE_NIGHT_COOKIE, board.id);
    await expect(lateNightGate(board, "/vote")).resolves.toBeNull();
  });
});

describe("continueToBoard", () => {
  it("remembers the board and goes on to the page asked for", async () => {
    getBoard.mockResolvedValue(board);

    await expect(
      continueToBoard(form({ slug: board.slug, page: "/hall-of-fame" })),
    ).rejects.toThrow(Redirect);

    expect(jar.get(LATE_NIGHT_COOKIE)).toBe(board.id);
    expect(set.mock.calls[0][2]).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
    });
    expect(redirect).toHaveBeenCalledWith(`/b/${board.slug}/hall-of-fame`);
  });

  it("goes to the board's current link when an old one was used", async () => {
    getBoard.mockResolvedValue(board);

    await expect(
      continueToBoard(form({ slug: "old-name-aaaa", page: "" })),
    ).rejects.toThrow(Redirect);

    expect(redirect).toHaveBeenCalledWith(`/b/${board.slug}`);
  });

  it("refuses a page that isn't one of the board's", async () => {
    await expect(
      continueToBoard(form({ slug: board.slug, page: "//evil.example" })),
    ).rejects.toThrow(NotFound);
    expect(set).not.toHaveBeenCalled();
  });

  it("is not found for a board that doesn't exist", async () => {
    getBoard.mockResolvedValue(null);

    await expect(
      continueToBoard(form({ slug: "gone-aaaa", page: "" })),
    ).rejects.toThrow(NotFound);
    expect(set).not.toHaveBeenCalled();
  });
});
