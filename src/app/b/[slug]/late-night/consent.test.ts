import { describe, expect, it } from "vitest";
import {
  acceptBoard,
  hasAcceptedBoard,
  MAX_REMEMBERED_BOARDS,
  parseAcceptedBoards,
} from "./consent";

const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;

describe("Late Night consent cookie", () => {
  it("remembers nothing without a cookie", () => {
    expect(parseAcceptedBoards(undefined)).toEqual([]);
    expect(hasAcceptedBoard(undefined, id(1))).toBe(false);
  });

  it("remembers a board once it's accepted", () => {
    const value = acceptBoard(undefined, id(1));
    expect(hasAcceptedBoard(value, id(1))).toBe(true);
    expect(hasAcceptedBoard(value, id(2))).toBe(false);
  });

  it("doesn't repeat a board accepted twice", () => {
    const value = acceptBoard(acceptBoard(undefined, id(1)), id(1));
    expect(parseAcceptedBoards(value)).toEqual([id(1)]);
  });

  it("ignores anything in the cookie that isn't a board id", () => {
    expect(parseAcceptedBoards(`${id(1)}.nope..<script>`)).toEqual([id(1)]);
  });

  it("drops the oldest boards past the limit", () => {
    let value: string | undefined;
    for (let n = 0; n <= MAX_REMEMBERED_BOARDS; n++) {
      value = acceptBoard(value, id(n));
    }
    const boards = parseAcceptedBoards(value);
    expect(boards).toHaveLength(MAX_REMEMBERED_BOARDS);
    expect(boards).not.toContain(id(0));
    expect(boards.at(-1)).toBe(id(MAX_REMEMBERED_BOARDS));
  });
});
