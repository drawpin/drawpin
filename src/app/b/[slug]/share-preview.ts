import type { Metadata } from "next";

/**
 * What each page inside a board says when its link is shared. Each is a link
 * someone sends for a reason ("come vote for mine"), so it says what to do
 * there; the board's name says where.
 */
const PAGES = {
  draw: {
    title: (name: string) => `Draw something for ${name}`,
    description: "Add your tile to the drawing board. One each per day!",
  },
  vote: {
    title: (name: string) => `Vote on ${name}`,
    description:
      "Come vote for mine! Pick your three favorites from last week's board.",
  },
  "hall-of-fame": {
    title: (name: string) => `${name} Hall of Fame`,
    description: "Every week's winning drawing, kept for good.",
  },
  final: {
    title: (name: string) => `Pick ${name}'s super winner`,
    description:
      "This month's weekly winners go head to head. One vote each, so make it count!",
  },
} as const;

export type SharedPage = keyof typeof PAGES;

/**
 * The link-preview card for a page inside a board. It uses the same fixed
 * image as the board itself (see the root layout for why it's versioned).
 */
export function sharePreview(
  page: SharedPage,
  board: { name: string; slug: string },
): Metadata["openGraph"] {
  const { title, description } = PAGES[page];
  return {
    type: "website",
    siteName: "DrawPin",
    title: title(board.name),
    description,
    url: `/b/${board.slug}/${page}`,
    images: [{ url: "/og-v2.png", width: 1200, height: 630, alt: "DrawPin" }],
  };
}
