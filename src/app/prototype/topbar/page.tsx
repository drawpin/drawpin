import Link from "next/link";
import { Ending } from "../../_home/shared";
import {
  BlueMenuButton,
  CornerMenuButton,
  FloatingMenuButton,
  Logo,
  type LogoKind,
  ProtoPoster,
  WhiteMenuButton,
} from "./parts";

const VARIANTS = {
  a: "A. Inside the poster",
  b: "B. Pinned to the corner",
  c: "C. Sticky white bar",
  d: "D. Floating Menu button",
} as const;
type Variant = keyof typeof VARIANTS;

const LOGOS: Record<LogoKind, string> = {
  text: "1. Type (today)",
  wordmark: "2. Brand wordmark",
  icon: "3. App icon + type",
  pin: "4. Type + push pin",
};

/**
 * TEMPORARY prototype (2026-11-02): where the phone's menu button and the
 * logo go on the home page, instead of a row of their own above the poster.
 * `?v=a|b|c|d` picks the placement, `&logo=text|wordmark|icon|pin` the logo.
 * The real sidebar and drawer are used, so the button really opens it.
 * Deleted with the rest of /prototype before feat/profiles merges.
 */
export default async function TopbarPrototype({
  searchParams,
}: PageProps<"/prototype/topbar">) {
  const query = await searchParams;
  const v: Variant =
    typeof query.v === "string" && query.v in VARIANTS
      ? (query.v as Variant)
      : "a";
  const logo: LogoKind =
    typeof query.logo === "string" && query.logo in LOGOS
      ? (query.logo as LogoKind)
      : "text";

  let poster;
  let bar = null;
  let floating = null;
  switch (v) {
    case "a":
      // The same row the board pages already have inside their blue header.
      poster = (
        <ProtoPoster
          top={
            <div className="-ml-2 flex items-center gap-2 lg:hidden">
              <BlueMenuButton />
              <Logo kind={logo} tone="blue" />
            </div>
          }
        />
      );
      break;
    case "b":
      poster = (
        <ProtoPoster
          corner={<CornerMenuButton />}
          top={
            <div className="-ml-1 lg:hidden">
              <Logo kind={logo} tone="blue" />
            </div>
          }
        />
      );
      break;
    case "c":
      bar = (
        <div className="border-foreground sticky top-0 z-30 border-b-2 bg-white/95 backdrop-blur lg:hidden">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2">
            <WhiteMenuButton />
            <div className="flex justify-center">
              <Logo kind={logo} tone="white" />
            </div>
            <a
              href="#join"
              className="border-foreground bg-winner inline-flex min-h-11 items-center rounded-xl border-2 px-3 text-sm font-bold"
            >
              Code
            </a>
          </div>
        </div>
      );
      poster = <ProtoPoster />;
      break;
    case "d":
      floating = <FloatingMenuButton />;
      poster = (
        <ProtoPoster
          top={
            <div className="-ml-1 lg:hidden">
              <Logo kind={logo} tone="blue" />
            </div>
          }
        />
      );
      break;
  }

  return (
    <div className="flex flex-1 flex-col bg-white">
      {bar}
      {poster}
      {floating}

      <section className="mx-auto mt-8 flex w-full max-w-6xl flex-col gap-3 px-5">
        <p className="bg-attention w-fit rounded-md px-2 py-0.5 text-sm font-bold">
          Prototype: pick a placement and a logo
        </p>
        <p className="text-muted-foreground text-sm">
          On a laptop the sidebar column replaces all of this, so look at it on
          a phone (or narrow the window).
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(VARIANTS) as Variant[]).map((key) => (
            <Link
              key={key}
              href={`/prototype/topbar?v=${key}&logo=${logo}`}
              className={`inline-flex min-h-11 items-center rounded-xl border-2 px-3 text-sm font-bold ${key === v ? "border-foreground bg-primary text-white" : "border-foreground bg-white"}`}
            >
              {VARIANTS[key]}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(LOGOS) as LogoKind[]).map((key) => (
            <Link
              key={key}
              href={`/prototype/topbar?v=${v}&logo=${key}`}
              className={`inline-flex min-h-11 items-center rounded-xl border-2 px-3 text-sm font-bold ${key === logo ? "border-foreground bg-primary text-white" : "border-foreground bg-white"}`}
            >
              {LOGOS[key]}
            </Link>
          ))}
        </div>
      </section>

      <Ending />
    </div>
  );
}
