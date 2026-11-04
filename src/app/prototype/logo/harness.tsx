"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
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
import { type LogoVariant, type Surface, VARIANTS } from "./variants";
import "./picker.css";

/* ------------------------------------------------------------ picker */

/** The picker, per the prototype skill's PICKER.md (behaviour contract). */
function Picker({
  current,
  onPick,
  onReplay,
}: {
  current: number;
  onPick: (index: number) => void;
  onReplay: () => void;
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
    <nav ref={nav} className="proto-picker" aria-label="Prototype variants">
      <span ref={highlight} className="proto-picker-highlight" aria-hidden />
      {VARIANTS.map((variant, index) => (
        <button
          key={variant.name}
          ref={(el) => {
            items.current[index] = el;
          }}
          type="button"
          className="proto-picker-item"
          data-active={index === current ? "" : undefined}
          aria-current={index === current ? "true" : undefined}
          onClick={() => onPick(index)}
        >
          {variant.name}
        </button>
      ))}
      <span className="proto-picker-divider" aria-hidden />
      <button
        type="button"
        className="proto-picker-item proto-picker-replay"
        aria-label="Replay animation (R)"
        onClick={onReplay}
      >
        ↻
      </button>
    </nav>
  );
}

/* ------------------------------------------------------------ frames */

/** The phone's menu button, in the poster's translucent style. */
function PosterMenuButton() {
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

/** A frame (the poster or the sidebar card) with the variant applied. */
function Framed({
  variant,
  surface,
  className,
  children,
}: {
  variant: LogoVariant;
  surface: Surface;
  className: string;
  children: ReactNode;
}) {
  const shadow = variant.ownShadow
    ? ""
    : surface === "poster"
      ? "shadow-[6px_6px_0_var(--foreground)]"
      : "shadow-[6px_6px_0_var(--primary)]";
  const card = (
    <div
      className={`border-foreground relative rounded-2xl border-2 ${shadow} ${className}`}
    >
      {variant.onFrame?.(surface)}
      {children}
    </div>
  );
  return variant.frame ? variant.frame(surface, card) : card;
}

function Poster({ variant }: { variant: LogoVariant }) {
  const pad = variant.framePad?.poster ?? "pt-5";
  const menu =
    variant.menu === "poster" ? (
      <div className="-mx-2 -mb-2 flex justify-end lg:hidden">
        <PosterMenuButton />
      </div>
    ) : null;
  const above = variant.above?.("poster");
  return (
    <div className="mx-auto w-full max-w-7xl px-3 pt-6 md:px-6">
      {above && (
        <div className="mb-4 flex items-center justify-between gap-3 px-1 lg:hidden">
          {above}
          {variant.menu === "page" && <PageMenuButton />}
        </div>
      )}
      <Framed
        variant={variant}
        surface="poster"
        className="bg-primary text-primary-foreground"
      >
        <div
          className={`relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 pb-10 md:min-h-[28rem] md:justify-center ${pad}`}
        >
          {menu}
          {variant.inside?.("poster")}
          <h1
            className={`relative z-10 font-black tracking-tighter ${variant.headline ? "" : "text-[clamp(4rem,14vw,10rem)] leading-[0.86]"}`}
          >
            {variant.headline ?? (
              <>
                Draw it.
                <br />
                <span className="text-winner">Pin it.</span>
              </>
            )}
          </h1>
          <p className="relative z-10 max-w-md text-lg text-white/85">
            One drawing a day. Everyone votes. One winner a week.
          </p>
          <div className="relative z-10 flex flex-wrap gap-3">
            <a href="#join" className={`draw-awake ${INKED_BUTTON}`}>
              <PencilSimpleIcon weight="bold" className="size-5" />I have a code
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
                    tile === HERO_WINNER ? <TrophyBadge size={40} /> : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      </Framed>
    </div>
  );
}

const ROW =
  "hover:bg-secondary flex min-h-11 items-center gap-3 rounded-lg px-2 font-semibold";

/** A laptop sidebar with realistic contents, to judge the logo in place. */
function MockSidebar({ variant }: { variant: LogoVariant }) {
  const pad = variant.framePad?.sidebar ?? "pt-4";
  // `lg:flex`, not the real column's `lg:block`, which this page hides.
  return (
    <aside className="sticky top-0 hidden h-dvh w-80 shrink-0 flex-col py-6 pl-6 lg:flex">
      {variant.above?.("sidebar")}
      <Framed
        variant={variant}
        surface="sidebar"
        className={`flex flex-1 flex-col gap-4 bg-white p-3 ${pad}`}
      >
        {variant.inside?.("sidebar")}
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
        <p className="text-muted-foreground mt-auto px-2 text-sm">
          About · Terms · Privacy
        </p>
      </Framed>
    </aside>
  );
}

/* ----------------------------------------------------------- harness */

/**
 * TEMPORARY prototype harness: four logo directions, one at a time and full
 * size, on the home page (the poster on a phone; the poster and a mock
 * sidebar on a laptop). The real sidebar column is hidden on this page only.
 */
export function LogoHarness({ initial }: { initial: number }) {
  // The page reads ?v= on the server, so a reload keeps the pick.
  const [current, setCurrent] = useState(
    initial >= 0 && initial < VARIANTS.length ? initial : 0,
  );
  const [mountKey, setMountKey] = useState(0);

  const pick = useCallback((index: number) => {
    if (index < 0 || index >= VARIANTS.length) return;
    setCurrent(index);
    setMountKey((key) => key + 1);
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(index + 1));
    history.replaceState(null, "", url);
  }, []);
  const replay = useCallback(() => setMountKey((key) => key + 1), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const num = Number.parseInt(event.key, 10);
      if (num >= 1 && num <= VARIANTS.length) pick(num - 1);
      else if (event.key === "ArrowRight")
        pick((current + 1) % VARIANTS.length);
      else if (event.key === "ArrowLeft")
        pick((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (event.key === "r" || event.key === "R") replay();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, pick, replay]);

  const variant = VARIANTS[current];
  return (
    <>
      {/* This page brings its own sidebar, so hide the real column. */}
      <style>{"aside.sticky.lg\\:block{display:none!important}"}</style>
      <div key={mountKey} className="flex flex-1 bg-white">
        <MockSidebar variant={variant} />
        <div className="flex min-w-0 flex-1 flex-col pb-24">
          <Poster variant={variant} />
          <Ending />
        </div>
      </div>
      <Picker current={current} onPick={pick} onReplay={replay} />
    </>
  );
}
