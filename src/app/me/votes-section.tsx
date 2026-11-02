import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import type { VoteSummary } from "@/lib/profile";
import { SectionHead } from "./section-head";

/**
 * This week's votes, a line per board. Votes are private, so this is the one
 * place they show. Hidden when there's nothing to show.
 */
export function VotesSection({ votes }: { votes: VoteSummary[] }) {
  if (votes.length === 0) return null;

  return (
    <section className="flex flex-col gap-5">
      <SectionHead note="This week" title="Your votes" />
      <ul className="border-foreground divide-foreground/10 flex flex-col divide-y-2 rounded-xl border-2 bg-white shadow-[4px_4px_0_var(--primary)]">
        {votes.map((vote) => (
          <li
            key={vote.boardSlug}
            className="flex items-center justify-between gap-3 py-2 pr-2 pl-4"
          >
            <span className="min-w-0">
              <span className="block truncate font-bold">{vote.boardName}</span>
              <span className="text-muted-foreground block text-sm">
                {vote.cast} of {vote.of} cast · {vote.note}
              </span>
            </span>
            {vote.cast < vote.of ? (
              <Link
                href={`/b/${vote.boardSlug}/vote`}
                className="border-foreground bg-winner inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border-2 px-3.5 text-sm font-extrabold shadow-[3px_3px_0_var(--foreground)]"
              >
                Vote
                <ArrowRightIcon weight="bold" className="size-4" />
              </Link>
            ) : (
              <span className="text-success shrink-0 px-2 text-sm font-bold">
                Done
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
