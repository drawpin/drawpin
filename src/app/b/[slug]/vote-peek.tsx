import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { WeekPeek } from "./data";

/** How many of last week's drawings the card fans out; the rest are "+N". */
export const PEEK_COUNT = 5;

/** A slight lean for each fanned drawing, like a hand of cards. */
const LEANS = ["-6deg", "3deg", "-2deg", "5deg", "-4deg"];

/**
 * The way into voting while last week is up for a vote: its drawings fanned
 * out, how many votes are left, and when voting closes. Showing what you'd
 * vote on is the invitation (chosen from prototypes on 2026-09-28).
 *
 * Seen once a visit, so its motion is small: the drawings fade up one after
 * another, and under a mouse they straighten as if being picked up. Both are
 * skipped for anyone who asks for reduced motion.
 */
export function VotePeek({
  href,
  peek,
  votesLeft,
  closesOn,
}: {
  href: string;
  peek: WeekPeek;
  votesLeft: number;
  /** The weekday voting closes, in the board's time zone. */
  closesOn: string;
}) {
  const more = peek.total - peek.imageUrls.length;

  return (
    <Link
      href={href}
      className="group shadow-lift focus-visible:ring-highlight flex flex-col gap-3 rounded-2xl border p-3.5 outline-none focus-visible:ring-3"
    >
      <span className="flex pl-2" aria-hidden>
        {peek.imageUrls.map((url, index) => (
          <span
            key={url}
            className="motion-safe:animate-fade-up -ml-2"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <Image
              src={url}
              alt=""
              width={48}
              height={48}
              // Already small WebP files from the storage CDN, like the feed.
              unoptimized
              style={
                { "--lean": LEANS[index % LEANS.length] } as React.CSSProperties
              }
              className="size-12 rotate-(--lean) rounded-[10px] border-2 border-white bg-white object-cover shadow-[0_2px_8px_rgb(0_74_173/0.14)] transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:rotate-0 motion-reduce:transition-none"
            />
          </span>
        ))}
        {more > 0 && (
          <span
            className="motion-safe:animate-fade-up bg-secondary text-primary -ml-2 grid size-12 place-items-center rounded-[10px] border-2 border-white text-sm font-bold"
            style={{ animationDelay: `${peek.imageUrls.length * 40}ms` }}
          >
            +{more}
          </span>
        )}
      </span>
      <span className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block leading-snug font-bold">
            Last week&apos;s drawings are up for a vote
          </span>
          <span className="text-muted-foreground block text-sm">
            {votesLeft} {votesLeft === 1 ? "vote" : "votes"} left, closes{" "}
            {closesOn}
          </span>
        </span>
        <span className={buttonVariants({ size: "sm" })}>Vote</span>
      </span>
    </Link>
  );
}
