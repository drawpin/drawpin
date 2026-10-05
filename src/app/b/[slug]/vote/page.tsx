import type { Metadata, Viewport } from "next";
import { BoardScreen } from "../board-screen";
import { getBoard } from "../data";

export async function generateMetadata({
  params,
}: PageProps<"/b/[slug]/vote">): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoard(slug);
  return {
    title: board ? `Vote · ${board.name}` : "Board not found · DrawPin",
  };
}

/** The phone's status bar matches the blue header, as on the board. */
export const viewport: Viewport = { themeColor: "#004aad" };

/**
 * The board in its vote view: last week's drawings to vote on, under the
 * board's own header (see `BoardScreen`). Its own address, so links to it,
 * the back button and the refresh after voting all land here.
 */
export default async function VotePage({
  params,
}: PageProps<"/b/[slug]/vote">) {
  const { slug } = await params;
  return <BoardScreen slug={slug} view="vote" />;
}
