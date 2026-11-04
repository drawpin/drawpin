"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckSquareIcon,
  CrownSimpleIcon,
  PencilSimpleIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import type { TodayCard as Card } from "@/lib/home-hub";
import { INKED_BUTTON } from "../b/[slug]/board-look";
import { OUTLINE_BUTTON } from "../_home/type";
import { SectionHead } from "./section-head";
import { useWaitingCards } from "./use-waiting";

const SMALL_INKED = `${INKED_BUTTON} h-11 px-4 text-[15px]`;
const SMALL_OUTLINE = `${OUTLINE_BUTTON} h-11 text-[15px] transition-colors duration-150 ease-out motion-reduce:transition-none`;

/** Each kind's shadow colour, matching its status dot. */
const SHADOW: Record<Card["kind"], string> = {
  draw: "var(--winner)",
  vote: "var(--primary)",
  final: "var(--attention)",
  results: "var(--highlight)",
};

/** The leans of the vote card's fanned drawings, as in `VotePeek`. */
const PEEK_LEANS = [-4, 2.8, 1.6];

/** A card's words and button, by kind (docs/design/profiles.md, section 10). */
function contentFor(card: Card): {
  icon: ReactNode;
  title: string;
  body: string;
  action: ReactNode;
} {
  const arrow = <ArrowRightIcon weight="bold" className="size-5" />;
  switch (card.kind) {
    case "draw":
      return {
        icon: <PencilSimpleIcon weight="bold" className="size-4" />,
        title: "Draw today",
        body: "You haven't posted here today. A new day starts at 4:00 AM.",
        action: (
          <Link href={card.href} className={`draw-awake ${SMALL_INKED}`}>
            <PencilSimpleIcon weight="bold" className="size-5" />
            Draw
          </Link>
        ),
      };
    case "vote": {
      const left = card.votesLeft ?? 0;
      return {
        icon: <CheckSquareIcon weight="bold" className="size-4" />,
        title: `${left} ${left === 1 ? "vote" : "votes"} left`,
        body: card.closesOn
          ? `Pick last week's best. Voting closes ${card.closesOn}.`
          : "Pick last week's best.",
        action: (
          <Link href={card.href} className={SMALL_OUTLINE}>
            Vote
            {arrow}
          </Link>
        ),
      };
    }
    case "final":
      return {
        icon: <CrownSimpleIcon weight="fill" className="size-4" />,
        title: "The final is open",
        body: `${card.month ?? "Last month"}'s weekly winners face off. You get one vote.`,
        action: (
          <Link href={card.href} className={SMALL_OUTLINE}>
            See the final
            {arrow}
          </Link>
        ),
      };
    case "results":
      return {
        icon: <TrophyIcon weight="fill" className="size-4" />,
        title: "Results are in",
        body: "Last week's winner has been picked.",
        action: (
          <Link href={card.href} className={SMALL_OUTLINE}>
            See who won
            {arrow}
          </Link>
        ),
      };
  }
}

/** One "Today" card: what's waiting, on which board, and its one button. */
function TodayCard({ card }: { card: Card }) {
  const { icon, title, body, action } = contentFor(card);
  return (
    <li
      className="border-foreground flex flex-col gap-3 rounded-xl border-2 bg-white p-4"
      style={{ boxShadow: `5px 5px 0 ${SHADOW[card.kind]}` }}
    >
      <p className="text-muted-foreground flex min-w-0 items-center gap-2 text-sm font-bold">
        <span aria-hidden className="shrink-0">
          {icon}
        </span>
        <span className="truncate">{card.name}</span>
      </p>
      <div className="flex flex-col gap-1">
        <h3 className="text-xl leading-tight font-black tracking-tight">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm">{body}</p>
      </div>
      {card.peek && card.peek.length > 0 && (
        <span className="flex gap-1.5" aria-hidden>
          {card.peek.map((url, index) => (
            <Image
              key={url}
              src={url}
              alt=""
              width={40}
              height={40}
              unoptimized
              className="border-foreground/20 size-10 rounded-md border bg-white object-cover"
              style={{ rotate: `${PEEK_LEANS[index]}deg` }}
            />
          ))}
        </span>
      )}
      <div className="mt-auto pt-1">{action}</div>
    </li>
  );
}

/**
 * "Waiting for you": a card for each board with something to do, most
 * urgent first. Gone entirely when nothing is waiting.
 */
export function TodaySection({ cards }: { cards: Card[] }) {
  const waiting = useWaitingCards(cards);
  if (waiting.length === 0) return null;
  return (
    <section className="flex flex-col gap-5" aria-labelledby="hub-today">
      <SectionHead id="hub-today" note="Today" title="Waiting for you" />
      <ul className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-4">
        {waiting.map((card) => (
          <TodayCard key={`${card.kind}:${card.venueId}`} card={card} />
        ))}
      </ul>
    </section>
  );
}
