import type { Metadata, Viewport } from "next";
import { BoardScreen } from "./board-screen";
import { getBoard } from "./data";

export async function generateMetadata({
  params,
}: PageProps<"/b/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoard(slug);
  if (!board) return { title: "Board not found · DrawPin" };

  return {
    title: `${board.name} · DrawPin`,
    // Shared into a group chat, the board is the thing being sent — so the
    // card carries its name alone, without the site's name after it, and the
    // line under it invites the person who was sent it. They have never heard
    // of DrawPin and are deciding whether to tap, so it says what to do rather
    // than what the page contains.
    openGraph: {
      type: "website",
      siteName: "DrawPin",
      title: board.name,
      description:
        "Tap to join the drawing board! One tile each per day, vote for your favorite!",
      url: `/b/${slug}`,
      images: [{ url: "/og-v2.png", width: 1200, height: 630, alt: "DrawPin" }],
    },
  };
}

/** The phone's status bar matches the board's blue header. */
export const viewport: Viewport = { themeColor: "#004aad" };

export default async function BoardPage({ params }: PageProps<"/b/[slug]">) {
  const { slug } = await params;
  return <BoardScreen slug={slug} view="board" />;
}
