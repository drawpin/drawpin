"use client";

import { useSyncExternalStore } from "react";
import { type TodayCard, waitingLine } from "@/lib/home-hub";
import { useWaitingCards } from "./use-waiting";

const noSubscription = () => () => {};

/** "Sunday, 2 November", in the browser's own time zone. */
function todayInWords(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("weekday")}, ${part("day")} ${part("month")}`;
}

/**
 * The hub's greeting: today's date, "Hi, {name}.", and how many things are
 * waiting. The date is the viewer's, which only the browser knows, so the
 * server leaves its line empty (at full height, so nothing moves) and the
 * browser fills it in.
 */
export function HubHeader({
  name,
  cards,
  hasBoards,
}: {
  name: string;
  cards: TodayCard[];
  hasBoards: boolean;
}) {
  const date = useSyncExternalStore(noSubscription, todayInWords, () => "");
  const waiting = useWaitingCards(cards);
  return (
    <>
      <p className="min-h-5 text-sm font-bold text-white/85">{date}</p>
      <h1 className="-mt-2 text-4xl leading-[1.02] font-black tracking-tight break-words sm:text-5xl">
        Hi, {name}.
      </h1>
      <p className="max-w-md text-lg text-white/85">
        {waitingLine(waiting.length, hasBoards)}
      </p>
    </>
  );
}
