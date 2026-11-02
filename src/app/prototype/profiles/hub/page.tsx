import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckSquareIcon,
  CrownSimpleIcon,
  PencilSimpleIcon,
  PlusIcon,
  PushPinIcon,
  TrophyIcon,
} from "@phosphor-icons/react/ssr";
import { pinColorFor, pinStyle } from "@/components/pin";
import { INKED_BUTTON, PAPER } from "../../../b/[slug]/board-look";
import { OUTLINE_BUTTON } from "../../../_home/type";
import { BOARDS, ME, type ProtoBoard } from "../_proto/data";
import { shellProps } from "../_proto/params";
import { SectionHead, ShellHeader, SideLink } from "../_proto/pages";
import { AppShell, OwnerChip, StatusLine } from "../_proto/shell";

/** One "Today" card: what's waiting, where, and the one button for it. */
function TodayCard({
  shadow,
  icon,
  kicker,
  title,
  body,
  action,
  peek,
}: {
  shadow: string;
  icon: ReactNode;
  kicker: string;
  title: string;
  body: string;
  action: ReactNode;
  peek?: string[];
}) {
  return (
    <li
      className="border-foreground flex flex-col gap-3 rounded-xl border-2 bg-white p-4"
      style={{ boxShadow: `5px 5px 0 ${shadow}` }}
    >
      <p className="text-muted-foreground flex items-center gap-2 text-sm font-bold">
        {icon}
        {kicker}
      </p>
      <div className="flex flex-col gap-1">
        <h3 className="text-xl leading-tight font-black tracking-tight">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm">{body}</p>
      </div>
      {peek && (
        <span className="flex gap-1.5" aria-hidden>
          {peek.map((url, index) => (
            <Image
              key={url}
              src={url}
              alt=""
              width={40}
              height={40}
              unoptimized
              className="border-foreground/20 size-10 rounded-md border bg-white object-cover"
              style={{ rotate: `${[-4, 2.8, 1.6][index]}deg` }}
            />
          ))}
        </span>
      )}
      <div className="mt-auto pt-1">{action}</div>
    </li>
  );
}

const SMALL_INKED = `${INKED_BUTTON} h-11 px-4 text-[15px]`;
const SMALL_OUTLINE = `${OUTLINE_BUTTON} h-11 text-[15px]`;

/** A board as a card: its latest three drawings pinned up, then its name. */
function BoardCard({ board }: { board: ProtoBoard }) {
  return (
    <li className="w-[78%] shrink-0 snap-start sm:w-auto">
      <Link
        href="/prototype/profiles/board"
        className="border-foreground focus-visible:ring-highlight flex h-full flex-col gap-4 rounded-xl border-2 bg-white p-4 pt-6 shadow-[5px_5px_0_var(--primary)] transition-[translate,box-shadow] duration-150 outline-none hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_var(--primary)] focus-visible:ring-3 active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0_var(--primary)]"
      >
        <span className="grid grid-cols-3 gap-2.5" aria-hidden>
          {board.latest.map((url, index) => (
            <span
              key={url + index}
              className={`pinned relative block p-1 ${PAPER}`}
              style={
                {
                  ...pinStyle(pinColorFor(board.slug + index)),
                  "--pin-scale": 0.7,
                  rotate: `${[-1.5, 1, -0.6][index]}deg`,
                } as CSSProperties
              }
            >
              <Image
                src={url}
                alt=""
                width={160}
                height={160}
                unoptimized
                className="aspect-square w-full object-cover"
              />
            </span>
          ))}
        </span>
        <span className="flex flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-lg leading-tight font-black tracking-tight">
              {board.name}
            </span>
            {board.pinned && (
              <PushPinIcon
                weight="fill"
                aria-label="Pinned"
                className="text-primary size-4 shrink-0"
              />
            )}
            {board.owned && <OwnerChip />}
          </span>
          <span className="text-muted-foreground text-sm">
            {board.drawingsThisWeek} drawings this week
          </span>
          <StatusLine board={board} />
        </span>
      </Link>
    </li>
  );
}

/**
 * PROTOTYPE: landing 1, the home hub for a returning signed-in visitor.
 * What's waiting today across their boards, then the boards themselves.
 */
export default async function ProtoHub({
  searchParams,
}: PageProps<"/prototype/profiles/hub">) {
  const query = await searchParams;
  const quiet = query.quiet === "1";
  return (
    <AppShell {...shellProps(query)} current="home">
      <ShellHeader>
        <p className="text-sm font-bold text-white/85">Sunday, 2 November</p>
        <h1 className="-mt-2 text-4xl leading-[1.02] font-black tracking-tight sm:text-5xl">
          Hi, {ME.name}.
        </h1>
        <p className="max-w-md text-lg text-white/85">
          {quiet
            ? "You're all caught up. See you at tomorrow's drawing."
            : "Four things are waiting on your boards."}
        </p>
      </ShellHeader>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-5 pt-10 pb-6">
        {!quiet && (
          <section className="flex flex-col gap-5" aria-labelledby="today">
            <SectionHead note="Today" title="Waiting for you" />
            <ul
              id="today"
              className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-4"
            >
              <TodayCard
                shadow="var(--winner)"
                icon={<PencilSimpleIcon weight="bold" className="size-4" />}
                kicker="Office Doodles"
                title="Draw today"
                body="You haven't posted here today. A new day starts at 4:00 AM."
                action={
                  <Link
                    href="/prototype/profiles/draw"
                    className={`draw-awake ${SMALL_INKED}`}
                  >
                    <PencilSimpleIcon weight="bold" className="size-5" />
                    Draw
                  </Link>
                }
              />
              <TodayCard
                shadow="var(--primary)"
                icon={<CheckSquareIcon weight="bold" className="size-4" />}
                kicker="Friends Board"
                title="3 votes left"
                body="Pick last week's best. Voting closes Sunday."
                peek={BOARDS[1].latest}
                action={
                  <Link href="#" className={SMALL_OUTLINE}>
                    Vote
                    <ArrowRightIcon weight="bold" className="size-5" />
                  </Link>
                }
              />
              <TodayCard
                shadow="var(--attention)"
                icon={<CrownSimpleIcon weight="fill" className="size-4" />}
                kicker="Room 12 Art Club"
                title="The final is open"
                body="October's weekly winners face off. You get one vote."
                action={
                  <Link href="#" className={SMALL_OUTLINE}>
                    See the final
                    <ArrowRightIcon weight="bold" className="size-5" />
                  </Link>
                }
              />
              <TodayCard
                shadow="var(--highlight)"
                icon={<TrophyIcon weight="fill" className="size-4" />}
                kicker="Book Club"
                title="Results are in"
                body="Last week's winner has been picked."
                action={
                  <Link href="#" className={SMALL_OUTLINE}>
                    See who won
                    <ArrowRightIcon weight="bold" className="size-5" />
                  </Link>
                }
              />
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-5">
          <SectionHead
            note="Pinned first"
            title="Your boards"
            action={<SideLink href="#">Manage</SideLink>}
          />
          <ul className="-mx-5 flex snap-x snap-mandatory scroll-px-5 [scrollbar-width:none] gap-5 overflow-x-auto px-5 pt-1 pb-3 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-y-6 sm:overflow-visible sm:px-0 xl:grid-cols-3">
            {BOARDS.slice(0, 4).map((board) => (
              <BoardCard key={board.slug} board={board} />
            ))}
          </ul>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="border-foreground flex flex-col gap-3 rounded-xl border-2 bg-white px-5 py-6 shadow-[5px_5px_0_var(--primary)]">
            <h2 className="text-2xl leading-tight font-black tracking-tight">
              Have a code?
            </h2>
            <p className="text-muted-foreground -mt-1">
              It&apos;s the 8-digit code on the board&apos;s card.
            </p>
            <div className="flex gap-2">
              <span className="border-foreground text-muted-foreground flex h-12 flex-1 items-center justify-center rounded-xl border-2 font-semibold">
                8-digit code
              </span>
              <span className={INKED_BUTTON}>Open</span>
            </div>
          </div>
          <div className="bg-primary text-primary-foreground border-foreground flex flex-col items-start gap-3 rounded-xl border-2 px-5 py-6 shadow-[5px_5px_0_var(--foreground)]">
            <h2 className="text-2xl leading-tight font-black tracking-tight">
              Start a board
            </h2>
            <p className="text-white/85">
              For your team, your class or your friends. It&apos;s free, and you
              can run up to 5.
            </p>
            <Link href="/prototype/profiles/admin" className={INKED_BUTTON}>
              <PlusIcon weight="bold" className="size-5" />
              Start a board
            </Link>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
