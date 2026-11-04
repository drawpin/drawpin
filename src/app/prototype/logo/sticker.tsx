"use client";

import Link from "next/link";
import { pinStyle } from "@/components/pin";
import { Wordmark } from "./variants";

/**
 * The picked logo direction (Sticker, 2026-11-03): the owner's logo on its
 * own white paper, pinned at a slant like the drawings. Positioning is the
 * caller's (`className`): usually `absolute -top-6` over a frame's top edge.
 */
export function LogoSticker({
  href = "/",
  className = "",
  size = "w-36",
}: {
  href?: string;
  className?: string;
  /** The logo's width. */
  size?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="DrawPin home"
      className={`focus-visible:ring-highlight z-20 w-fit rounded-lg outline-none focus-visible:ring-3 ${className}`}
    >
      <span
        style={pinStyle("#ffca39", 150)}
        className="pinned pin-pop border-foreground relative block -rotate-2 rounded-md border-2 bg-white px-2.5 pt-2.5 pb-1.5 shadow-[3px_3px_0_var(--foreground)]"
      >
        <Wordmark priority className={size} />
      </span>
    </Link>
  );
}
