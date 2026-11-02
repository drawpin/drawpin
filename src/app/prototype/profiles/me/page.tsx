import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  CrownSimpleIcon,
  DownloadSimpleIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react/ssr";
import { pinColorFor, pinStyle } from "@/components/pin";
import { hand } from "@/lib/fonts";
import {
  HEADER_BUTTON,
  INKED_BUTTON,
  PAPER,
} from "../../../b/[slug]/board-look";
import { MY_DRAWINGS, MY_VOTES, ME, TROPHIES } from "../_proto/data";
import { shellProps } from "../_proto/params";
import { SectionHead, ShellHeader, SideLink } from "../_proto/pages";
import { AppShell } from "../_proto/shell";

const STATS = [
  { value: ME.stats.drawings, label: "Drawings posted" },
  { value: ME.stats.weeklyWins, label: "Weekly wins" },
  { value: ME.stats.superWins, label: "Super wins" },
  { value: ME.stats.boards, label: "Boards drawn on" },
];

/**
 * PROTOTYPE: the private profile hub, grown from /account. Only its owner
 * ever sees it.
 */
export default async function ProtoProfile({
  searchParams,
}: PageProps<"/prototype/profiles/me">) {
  const query = await searchParams;
  const editing = query.edit === "1";
  return (
    <AppShell {...shellProps(query)} current="profile">
      <ShellHeader>
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="border-foreground bg-winner text-foreground flex size-16 shrink-0 items-center justify-center rounded-full border-2 text-3xl font-black shadow-[3px_3px_0_var(--foreground)]"
          >
            {ME.initial}
          </span>
          <div className="min-w-0">
            <h1 className="text-4xl leading-[1.02] font-black tracking-tight break-words">
              {ME.name}
              <span className="font-bold text-white/70">#{ME.tag}</span>
            </h1>
            <p className="mt-1 text-sm text-white/85">
              Drawing since {ME.joined}
            </p>
          </div>
        </div>
        {editing ? (
          <form className="flex max-w-md flex-col gap-2">
            <label htmlFor="username" className="text-sm font-bold">
              Your name on the board
            </label>
            <div className="flex gap-2">
              <input
                id="username"
                defaultValue={ME.name}
                maxLength={24}
                className="border-foreground text-foreground focus-visible:ring-winner h-12 min-w-0 flex-1 rounded-xl border-2 bg-white px-3.5 outline-none focus-visible:ring-3"
              />
              <button type="button" className={INKED_BUTTON}>
                Save
              </button>
            </div>
            <p className="text-sm text-white/85">
              Your #{ME.tag} stays the same. New names show on drawings you post
              from now on.
            </p>
          </form>
        ) : (
          <div>
            <Link href="?edit=1" className={HEADER_BUTTON}>
              <PencilSimpleIcon weight="bold" className="size-5" />
              Change your name
            </Link>
          </div>
        )}
      </ShellHeader>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-5 pt-10 pb-6">
        <section aria-label="Your numbers">
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="border-foreground flex flex-col-reverse gap-1 rounded-xl border-2 bg-white px-4 py-3.5 shadow-[4px_4px_0_var(--primary)]"
              >
                <dt className="text-muted-foreground text-sm font-semibold">
                  {stat.label}
                </dt>
                <dd className="text-4xl leading-none font-black tracking-tight">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex flex-col gap-6">
          <SectionHead note="Kept forever" title="Your trophies" />
          {/* The shelf: drawings standing on one inked plank, scrolling
              sideways on a phone. */}
          <div className="-mx-5 [scrollbar-width:none] overflow-x-auto px-5 pt-5 pb-2">
            <ul className="border-foreground relative flex w-max gap-8 border-b-[6px] px-4 pb-0 shadow-[0_6px_0_var(--primary)]">
              {TROPHIES.map((trophy, index) => (
                <li
                  key={trophy.id}
                  className="relative flex w-40 flex-col items-center gap-2 pb-3"
                >
                  <span
                    className={`pinned relative block w-full p-1.5 ${PAPER}`}
                    style={
                      {
                        ...pinStyle(pinColorFor(trophy.id)),
                        rotate: `${[-2, 1.5, -1, 2][index % 4]}deg`,
                      } as CSSProperties
                    }
                  >
                    <Image
                      src={trophy.imageUrl}
                      alt={`Your winning drawing on ${trophy.board}`}
                      width={160}
                      height={160}
                      unoptimized
                      className="aspect-square w-full object-cover"
                    />
                    <Image
                      src="/trophies/gold.webp"
                      alt=""
                      width={40}
                      height={40}
                      unoptimized
                      className="absolute -right-3 -bottom-3 rotate-6 drop-shadow-[2px_2px_0_rgb(15_27_45/0.25)]"
                    />
                  </span>
                  <span className="flex flex-col items-center text-center">
                    <span className="flex items-center gap-1 text-sm leading-tight font-bold">
                      {trophy.kind === "super" && (
                        <CrownSimpleIcon
                          weight="fill"
                          className="text-attention size-4"
                        />
                      )}
                      {trophy.label}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {trophy.board}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <SectionHead note="This week" title="Your votes" />
          <ul className="border-foreground divide-foreground/10 flex flex-col divide-y-2 rounded-xl border-2 bg-white shadow-[4px_4px_0_var(--primary)]">
            {MY_VOTES.map((vote) => (
              <li
                key={vote.board}
                className="flex items-center justify-between gap-3 py-2 pr-2 pl-4"
              >
                <span className="min-w-0">
                  <span className="block truncate font-bold">{vote.board}</span>
                  <span className="text-muted-foreground block text-sm">
                    {vote.cast} of {vote.of} cast · {vote.note}
                  </span>
                </span>
                {vote.cast < vote.of ? (
                  <Link
                    href="#"
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

        <section id="drawings" className="flex scroll-mt-6 flex-col gap-8">
          <SectionHead note="Newest first" title="Your drawings" />
          <p className="text-muted-foreground -mt-4 max-w-xl text-sm">
            Drawings that don&apos;t win are deleted 30 days after their
            week&apos;s voting ends, so save the ones you want. Winners are kept
            forever.
          </p>
          {MY_DRAWINGS.map((group) => (
            <div key={group.board} className="flex flex-col gap-4">
              <div className="border-foreground/10 flex items-center justify-between gap-3 border-b-2 pb-1">
                <h3 className="text-xl font-black tracking-tight">
                  {group.board}
                </h3>
                <SideLink href="/prototype/profiles/board">Open</SideLink>
              </div>
              <ul className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
                {group.drawings.map((drawing) => (
                  <li key={drawing.id} className="flex min-w-0 flex-col gap-2">
                    <span className={`relative block p-1.5 ${PAPER}`}>
                      <Image
                        src={drawing.imageUrl}
                        alt={drawing.caption ?? "Your drawing"}
                        width={240}
                        height={240}
                        unoptimized
                        className="aspect-square w-full object-cover"
                      />
                      {drawing.win && (
                        <Image
                          src="/trophies/gold.webp"
                          alt=""
                          width={36}
                          height={36}
                          unoptimized
                          className="absolute -right-2.5 -bottom-2.5 rotate-6 drop-shadow-[2px_2px_0_rgb(15_27_45/0.25)]"
                        />
                      )}
                    </span>
                    {drawing.caption && (
                      <span
                        className={`${hand.className} text-muted-foreground truncate text-lg leading-tight`}
                      >
                        &ldquo;{drawing.caption}&rdquo;
                      </span>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {drawing.postedOn}
                    </span>
                    {drawing.keptUntil ? (
                      <span className="text-muted-foreground text-xs">
                        Kept until {drawing.keptUntil}
                      </span>
                    ) : (
                      <span className="bg-winner border-foreground w-fit rounded-md border-2 px-1.5 text-xs font-bold">
                        {drawing.win === "super" ? "Super winner" : "Winner"} ·
                        kept forever
                      </span>
                    )}
                    <a
                      href="#"
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

        <section className="border-foreground flex flex-col gap-2 rounded-xl border-2 bg-white p-5 shadow-[4px_4px_0_var(--destructive)]">
          <h2 className="font-black tracking-tight">Your account</h2>
          <p className="text-muted-foreground text-sm">
            Deleting your account deletes your drawings and votes. Winners stay
            in their board&apos;s Hall of Fame, without your name.
          </p>
          <Link
            href="#"
            className="text-destructive inline-flex min-h-11 items-center self-start text-sm underline underline-offset-4"
          >
            Delete account
          </Link>
        </section>
      </main>
    </AppShell>
  );
}
