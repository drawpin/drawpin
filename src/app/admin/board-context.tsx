"use client";

import { createContext, type ReactNode, useContext } from "react";
import { BOARD_ID_FIELD } from "./board-field";

const BoardIdContext = createContext<string | null>(null);

/**
 * Tells the owner screen's forms which board they act on (ADR-016), so each
 * one can name it to its Server Action without threading it through every
 * component. The action checks the board is the account's; this is only
 * which board was on screen.
 */
export function AdminBoardProvider({
  boardId,
  children,
}: {
  boardId: string;
  children: ReactNode;
}) {
  return <BoardIdContext value={boardId}>{children}</BoardIdContext>;
}

/** The hidden field naming the board, for every form on the owner screen. */
export function BoardIdField() {
  const boardId = useContext(BoardIdContext);
  if (!boardId) {
    throw new Error("BoardIdField must be inside an AdminBoardProvider");
  }
  return <input type="hidden" name={BOARD_ID_FIELD} value={boardId} />;
}
