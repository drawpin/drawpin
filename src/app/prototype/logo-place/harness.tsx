"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  HouseIcon,
  ListIcon,
  PencilSimpleIcon,
  PlusIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { useShell } from "@/components/app-shell/shell-frame";
import { TrophyBadge } from "@/components/trophy-badge";
import { HEADER_BUTTON, INKED_BUTTON } from "../../b/[slug]/board-look";
import { PinnedDrawing } from "../../b/[slug]/pinned-drawing";
import { Ending, HERO_EXAMPLES, HERO_WINNER } from "../../_home/shared";
import { type Placement, PLACEMENTS } from "./variants";
import "../logo/picker.css";

const COUNT = 4;
const PAGES = ["Home", "Hub"] as const;
type Page = (typeof PAGES)[number];

/* ------------------------------------------------------------ picker */

/** The picker, per the prototype skill's PICKER.md (behaviour contract). */
function Picker({
  names,
  current,
  onPick,
  onReplay,
  position,
}: {
  names: readonly string[];
  current: number;
  onPick: (index: number) => void;
  onReplay?: () => void;
  position?: "top";
}) {
  const nav = useRef<HTMLElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  const move = useCallback(() => {
    const el = items.current[current];
    if (!el || !highlight.current) return;
    highlight.current.style.width = `${el.offsetWidth}px`;
    highlight.current.style.transform = `translateX(${el.offsetLeft}px)`;
  }, [current]);

  useLayoutEffect(move, [move]);
  useEffect(() => {
    window.addEventListener("resize", move);
    return () => window.removeEventListener("resize", move);
  }, [move]);
  useEffect(() => {
    // Enable the slide only after first paint, so load doesn't animate.
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => nav.current?.setAttribute("data-ready", "")),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <nav
      ref={nav}
      className="proto-picker"
      data-position={position}
      // The page switch sits just above the variant picker, out of the way.
      style={position ? { top: "auto", bottom: 64 } : undefined}
      aria-label={position ? "Prototype page" : "Prototype variants"}
    >
      <span ref={highlight} className="proto-picker-highlight" aria-hidden />
      {names.map((name, index) => (
        <button
          key={name}
          ref={(el) => {
            items.current[index] = el;
          }}
          type="button"
          className="proto-picker-item"
          data-active={index === current ? "" : undefined}
          aria-current={index === current ? "true" : undefined}
          onClick={() => onPick(index)}
        >
          {name}
        </button>
      ))}
      {onReplay && (
        <>
          <span className="proto-picker-divider" aria-hidden />
          <button
            type="button"
            className="proto-picker-item proto-picker-replay"
            aria-label="Replay animation (R)"
            onClick={onReplay}
          >
            ↻
          </button>
        </>
      )}
    </nav>
  );
}

/* ------------------------------------------------------------ pieces */

/** The phone's menu button inside the blue card (translucent). */
function BlueMenuButton() {
  const { setDrawerOpen } = useShell();
  return (
    <button
      type="button"
      aria-label="Open menu"
      onClick={() => setDrawerOpen(true)}
      className="focus-visible:ring-highlight inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/35 outline-none hover:bg-white/25 focus-visible:ring-3 lg:hidden"
    >
      <ListIcon weight="bold" className="size-6" />
    </button>
  );
}

/** The phone's menu button on the white page, inked like the cards. */
function PageMenuButton() {
  const { setDrawerOpen } = useShell();
  return (
    <button
      type="button"
      aria-label="Open menu"
      onClick={() => setDrawerOpen(true)}
      className="border-foreground hover:bg-secondary focus-visible:ring-highlight inline-flex size-11 shrink-0 items-center justify-center rounded-xl border-2 bg-white shadow-[3px_3px_0_var(--foreground)] outline-none focus-visible:ring-3 lg:hidden"
    >
      <ListIcon weight="bold" className="size-6" />
    </button>
  );
}

const SPOTS = [
  "md:absolute md:top-10 md:right-[4%] md:w-40 md:rotate-2",
  "md:absolute md:top-[44%] md:right-[22%] md:w-40 md:-rotate-1",
  "md:absolute md:bottom-6 md:right-[3%] md:w-40 md:rotate-1",
];

/** The blue header card: the home page's poster, or the hub's header. */
function Header({ placement, page }: { placement: Placement; page: Page }) {
  const pad = placement.framePad?.poster ?? "pt-5";
  const menuRow =
    placement.menu === "frame" ? (
      <div className="-mx-2 -mb-2 flex justify-end lg:hidden">
        <BlueMenuButton />
      </div>
    ) : null;
  return (
    <div
      className={`mx-auto w-full max-w-7xl px-3 md:px-6 ${placement.headerGap ?? "pt-6"}`}
    >
      <div className="bg-primary text-primary-foreground border-foreground relative rounded-2xl border-2 shadow-[6px_6px_0_var(--foreground)]">
        {placement.onFrame?.("poster")}
        {page === "Home" ? (
          <div
            className={`relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 pb-10 md:min-h-[28rem] md:justify-center ${pad}`}
          >
            {menuRow}
            <h1 className="relative z-10 text-[clamp(4rem,14vw,10rem)] leading-[0.86] font-black tracking-tighter">
              Draw it.
              <br />
              <span className="text-winner">Pin it.</span>
            </h1>
            <p className="relative z-10 max-w-md text-lg text-white/85">
              One drawing a day. Everyone votes. One winner a week.
            </p>
            <div className="relative z-10 flex flex-wrap gap-3">
              <a href="#join" className={`draw-awake ${INKED_BUTTON}`}>
                <PencilSimpleIcon weight="bold" className="size-5" />I have a
                code
              </a>
              <Link href="/setup" className={`${HEADER_BUTTON} text-base`}>
                Start a board
              </Link>
            </div>
            <ul className="grid grid-cols-3 gap-3 pt-6 md:contents">
              {HERO_EXAMPLES.map((tile, index) => (
                <li key={tile.id} className={`min-w-0 ${SPOTS[index]}`}>
                  <PinnedDrawing
                    tile={tile}
                    index={index}
                    badge={
                      tile === HERO_WINNER ? (
                        <TrophyBadge size={40} />
                      ) : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div
            className={`relative flex flex-col gap-3 px-5 pb-7 md:px-8 ${pad}`}
          >
            {menuRow}
            <p className="text-sm font-bold text-white/80">
              Tuesday, 4 November
            </p>
            <h1 className="text-4xl leading-[1.02] font-black tracking-tight sm:text-5xl">
              Hi, Ahmad.
            </h1>
            <p className="text-lg text-white/85">
              Three things are waiting on your boards.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** The hub's body: a few "waiting for you" cards. */
function HubBody() {
  const cards = [
    [
      "Office Doodles",
      "Draw today",
      "You haven't posted here today.",
      "Draw",
      "shadow-[6px_6px_0_var(--winner)]",
    ],
    [
      "Friends Board",
      "3 votes left",
      "Pick last week's best.",
      "Vote",
      "shadow-[6px_6px_0_var(--primary)]",
    ],
    [
      "Book Club",
      "Results are in",
      "Last week's winner has been picked.",
      "See who won",
      "shadow-[6px_6px_0_var(--highlight)]",
    ],
  ];
  return (
    <section className="mx-auto mt-10 flex w-full max-w-7xl flex-col gap-4 px-3 md:px-6">
      <h2 className="text-2xl font-black tracking-tight">Waiting for you</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map(([board, title, body, action, shadow]) => (
          <article
            key={board}
            className={`border-foreground flex flex-col gap-2 rounded-2xl border-2 bg-white p-5 ${shadow}`}
          >
            <p className="text-muted-foreground text-sm font-bold">{board}</p>
            <h3 className="text-xl font-black tracking-tight">{title}</h3>
            <p className="text-muted-foreground text-sm">{body}</p>
            <a
              href="#"
              className="border-foreground mt-2 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border-2 px-4 font-bold"
            >
              {action}
              <ArrowRightIcon weight="bold" className="size-4" />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

const ROW =
  "hover:bg-secondary flex min-h-11 items-center gap-3 rounded-lg px-2 font-semibold";

/** A laptop sidebar with realistic contents, to judge the logo in place. */
function MockSidebar({ placement }: { placement: Placement }) {
  const pad = placement.framePad?.sidebar ?? "pt-4";
  // `lg:flex`, not the real column's `lg:block`, which this page hides.
  return (
    <aside className="sticky top-0 hidden h-dvh w-80 shrink-0 flex-col py-6 pl-6 lg:flex">
      <div
        className={`border-foreground relative flex flex-1 flex-col gap-4 rounded-2xl border-2 bg-white p-3 shadow-[6px_6px_0_var(--primary)] ${pad}`}
      >
        {placement.onFrame?.("sidebar")}
        <nav aria-label="DrawPin" className="flex flex-col gap-1">
          <Link href="/me" className={ROW}>
            <span className="bg-primary inline-flex size-8 items-center justify-center rounded-full text-sm font-black text-white">
              A
            </span>
            <span>
              Ahmad H<span className="text-muted-foreground">#5358</span>
            </span>
          </Link>
          <Link href="/" className={`${ROW} bg-secondary`}>
            <HouseIcon weight="bold" className="size-5" />
            Home
          </Link>
          <Link href="/me" className={ROW}>
            <UserCircleIcon weight="bold" className="size-5" />
            Your profile
          </Link>
        </nav>
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground px-2 text-sm font-bold">
            Your boards
          </p>
          {[
            ["Office Doodles", "Draw today", "bg-winner"],
            ["Friends board", "3 votes left", "bg-primary"],
            ["Book club", "Results are in", "bg-highlight"],
          ].map(([name, status, dot]) => (
            <Link key={name} href="#" className={`${ROW} py-1.5`}>
              <span className="border-foreground bg-secondary size-9 shrink-0 rounded-md border-2" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{name}</span>
                <span className="text-muted-foreground flex items-center gap-1.5 text-sm font-normal">
                  <span className={`size-2 rounded-full ${dot}`} />
                  {status}
                </span>
              </span>
            </Link>
          ))}
        </div>
        <Link href="/setup" className={ROW}>
          <PlusIcon weight="bold" className="size-5" />
          Start a board
        </Link>
        <div className="mt-auto flex flex-col gap-3">
          {placement.sidebarFoot}
          <p className="text-muted-foreground px-2 text-sm">
            About · Terms · Privacy
          </p>
        </div>
      </div>
    </aside>
  );
}

/* ----------------------------------------------------------- harness */

/**
 * TEMPORARY prototype harness: four places for the logo, none of them a box,
 * one at a time and full size, on the home page or the hub (top pill). The
 * real sidebar column is hidden on this page only.
 */
export function PlacementHarness({
  initial,
  initialPage,
}: {
  initial: number;
  initialPage: number;
}) {
  const [current, setCurrent] = useState(
    initial >= 0 && initial < COUNT ? initial : 0,
  );
  const [page, setPage] = useState(initialPage === 1 ? 1 : 0);
  const [mountKey, setMountKey] = useState(0);

  const sync = useCallback((v: number, p: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(v + 1));
    url.searchParams.set("page", PAGES[p].toLowerCase());
    history.replaceState(null, "", url);
  }, []);
  const pick = useCallback(
    (index: number) => {
      if (index < 0 || index >= COUNT) return;
      setCurrent(index);
      setMountKey((key) => key + 1);
      sync(index, page);
    },
    [page, sync],
  );
  const pickPage = useCallback(
    (index: number) => {
      setPage(index);
      setMountKey((key) => key + 1);
      sync(current, index);
    },
    [current, sync],
  );
  const replay = useCallback(() => setMountKey((key) => key + 1), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const num = Number.parseInt(event.key, 10);
      if (num >= 1 && num <= COUNT) pick(num - 1);
      else if (event.key === "ArrowRight") pick((current + 1) % COUNT);
      else if (event.key === "ArrowLeft") pick((current - 1 + COUNT) % COUNT);
      else if (event.key === "r" || event.key === "R") replay();
      else if (event.key === "p" || event.key === "P") pickPage(1 - page);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, page, pick, pickPage, replay]);

  const placements = PLACEMENTS(<PageMenuButton />, <PageMenuButton />);
  const placement = placements[current];
  const which = PAGES[page];
  return (
    <>
      {/* This page brings its own sidebar, so hide the real column. */}
      <style>{"aside.sticky.lg\\:block{display:none!important}"}</style>
      <div key={mountKey} className="flex flex-1 bg-white">
        {placement.spine}
        <div className="flex min-w-0 flex-1 flex-col">
          {placement.bar}
          <div className="flex flex-1">
            <MockSidebar placement={placement} />
            <div className="flex min-w-0 flex-1 flex-col pb-24">
              <Header placement={placement} page={which} />
              {which === "Home" ? <Ending /> : <HubBody />}
              {placement.pageFoot}
            </div>
          </div>
        </div>
      </div>
      <Picker
        names={placements.map((p) => p.name)}
        current={current}
        onPick={pick}
        onReplay={replay}
      />
      <Picker names={PAGES} current={page} onPick={pickPage} position="top" />
    </>
  );
}
