import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, DownloadSimpleIcon } from "@phosphor-icons/react/ssr";
import { TrophyBadge } from "@/components/trophy-badge";
import { hand } from "@/lib/fonts";
import { KEPT_FOR_DAYS } from "@/lib/my-drawings";
import { formatDayMonth, type DrawingGroup } from "@/lib/profile";
import { PAPER } from "../b/[slug]/board-look";
import { SectionHead } from "./section-head";

/**
 * Every drawing of the account's that's still on a board, grouped by board,
 * with a way to keep each one before the clean-up (issue #57). Winners say
 * they're kept forever; the rest say when they go.
 */
export function DrawingsSection({ groups }: { groups: DrawingGroup[] }) {
  return (
    <section id="drawings" className="flex scroll-mt-6 flex-col gap-8">
      <SectionHead note="Newest first" title="Your drawings" />
      <p className="text-muted-foreground -mt-4 max-w-xl text-sm">
        Drawings that don&apos;t win are deleted {KEPT_FOR_DAYS} days after
        their week&apos;s voting ends, so save the ones you want. Winners are
        kept forever.
      </p>

      {groups.length === 0 && (
        <p className="border-foreground text-muted-foreground rounded-xl border-2 bg-white px-4 py-8 text-center shadow-[4px_4px_0_var(--primary)]">
          Nothing here yet. Drawings you post show up here.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.boardSlug} className="flex flex-col gap-4">
          <div className="border-foreground/10 flex items-center justify-between gap-3 border-b-2 pb-1">
            <h3 className="text-xl font-black tracking-tight">
              {group.boardName}
            </h3>
            <Link
              href={`/b/${group.boardSlug}`}
              className="text-primary inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-bold underline-offset-4 hover:underline"
            >
              Open
              <ArrowRightIcon weight="bold" className="size-4" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
            {group.drawings.map((drawing) => (
              <li key={drawing.id} className="flex min-w-0 flex-col gap-2">
                <span className={`relative block p-1.5 ${PAPER}`}>
                  <Image
                    src={drawing.imageUrl}
                    alt={
                      drawing.caption ?? `Your drawing on ${drawing.boardName}`
                    }
                    width={240}
                    height={240}
                    unoptimized
                    className="aspect-square w-full object-cover"
                  />
                  {drawing.win && <TrophyBadge size={36} />}
                </span>
                {drawing.caption && (
                  <span
                    className={`${hand.className} text-muted-foreground truncate text-lg leading-tight`}
                  >
                    &ldquo;{drawing.caption}&rdquo;
                  </span>
                )}
                <span className="text-muted-foreground text-xs">
                  {formatDayMonth(drawing.postedAt)}
                </span>
                {drawing.win ? (
                  <span className="bg-winner border-foreground w-fit rounded-md border-2 px-1.5 text-xs font-bold">
                    {drawing.win === "super" ? "Super winner" : "Winner"} · kept
                    forever
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    Kept until {formatDayMonth(drawing.deletedAfter!)}
                  </span>
                )}
                <a
                  href={`/account/drawings/${drawing.id}`}
                  className="border-foreground hover:bg-secondary inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 bg-white text-sm font-bold"
                >
                  <DownloadSimpleIcon weight="bold" className="size-4" />
                  Save as PNG
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
