import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { Caveat } from "next/font/google";

/** The board's handwriting, the same Caveat its notes and captions use. */
const hand = Caveat({ subsets: ["latin"], weight: ["600", "700"] });

const INK = "#0f1b2d";
const BLUE = "#004aad";
const SKY = "#6badfa";
const YELLOW = "#ffca39";
const ORANGE = "#ff821b";

/** What every card says. The daily code changes, so it can't be printed. */
export const CARD_COPY = {
  headline: "Scan to join the drawing board!",
  detail: "One tile each per day, vote for your favorite!",
  footer: "No camera? Go to drawpin.io and type today's code.",
} as const;

/**
 * A card is printed whole on a poster, or as a landscape half-sheet twice
 * over on a folding table tent.
 */
export type CardLayout = "poster" | "panel";

/**
 * One look: everything that differs between them. The card itself, its
 * wording, type and layout are the same in every look, so all five read as
 * the same site; only the paper around it, the accent and an edge change.
 */
type Theme = {
  /** The sheet behind the card. */
  paper: string;
  /** The card's hard offset shadow and the board name's colour. */
  accent: string;
  /** The push pin holding the card up. */
  pin: string;
  /** Ink-saver draws everything in black outline, with no fills. */
  mono?: boolean;
  /** The wordmark sits on a white tab when the paper is dark. */
  wordmarkTab?: boolean;
  edge?: (layout: CardLayout) => ReactNode;
};

/**
 * The site's push pin (src/components/pin.ts on the UI branch), drawn the
 * same way: ink outline, palette fill, one highlight, leaning right.
 */
function Pin({ color, mono }: { color: string; mono?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 30"
      aria-hidden
      className="absolute left-1/2 z-10 -translate-x-1/2"
      style={{
        top: "calc(-0.8 * var(--pin))",
        width: "var(--pin)",
        height: "calc(var(--pin) * 1.25)",
        filter: mono
          ? undefined
          : `drop-shadow(2px 2px 0 rgb(15 27 45 / 0.28))`,
      }}
    >
      <g
        transform="translate(-10 -2) rotate(30 13 31)"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={mono ? "white" : color}
      >
        <path d="M13 23v8" strokeLinecap="round" />
        <rect x="4" y="19" width="18" height="5" rx="2.5" />
        <path d="M10 19.5v-10h6v10" />
        <rect x="6" y="4" width="14" height="6" rx="3" />
        {!mono && (
          <path
            d="M11.8 11.5v5.5"
            stroke="white"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeOpacity="0.8"
          />
        )}
      </g>
    </svg>
  );
}

/**
 * The wordmark with its tagline, cut from the link-preview card
 * (og-v2.png) at print resolution: it's the complete lockup, pencil tip and
 * letter shadows included. Its image has a white ground, so it sits on white.
 */
function Wordmark({ width, mono }: { width: string; mono?: boolean }) {
  return (
    <Image
      src="/print-wordmark.png"
      alt="DrawPin"
      width={635}
      height={212}
      className={`${width} ${mono ? "contrast-150 grayscale" : ""}`}
    />
  );
}

/** Long board names step down a size so they never push the QR off. */
function nameSize(name: string, layout: CardLayout): string {
  const long = name.length > 26;
  if (layout === "poster") return long ? "text-[24pt]" : "text-[32pt]";
  return long ? "text-[16pt]" : "text-[21pt]";
}

/** The card: the same in every look. */
function Card({
  name,
  qrSvg,
  layout,
  theme,
}: {
  name: string;
  qrSvg: string;
  layout: CardLayout;
  theme: Theme;
}) {
  const poster = layout === "poster";
  const qr = (
    <div
      // The SVG is generated server-side by the qrcode library from our own
      // board URL, so it contains no user-controlled markup.
      dangerouslySetInnerHTML={{ __html: qrSvg }}
      className={`shrink-0 rounded-[0.08in] border-[2px] bg-white [&_svg]:block [&_svg]:size-full ${
        poster ? "size-[4in] p-[0.08in]" : "size-[3.15in] p-[0.06in]"
      }`}
      style={{ borderColor: INK }}
    />
  );
  const words = (
    <div
      className={`flex min-w-0 flex-col ${poster ? "items-center gap-[0.1in] text-center" : "gap-[0.08in]"}`}
    >
      <p
        className={`leading-tight font-black tracking-tight text-balance break-words ${nameSize(name, layout)}`}
        style={{
          color: theme.mono
            ? INK
            : theme.accent === YELLOW
              ? BLUE
              : theme.accent,
        }}
      >
        {name}
      </p>
      <p
        className={`${hand.className} leading-[0.95] font-bold text-balance ${poster ? "text-[40pt]" : "text-[27pt]"}`}
        style={{ color: INK }}
      >
        {CARD_COPY.headline}
      </p>
      <p
        className={`font-semibold text-balance ${poster ? "text-[16pt]" : "text-[12pt]"}`}
        style={{ color: INK }}
      >
        {CARD_COPY.detail}
      </p>
    </div>
  );

  return (
    <div
      className={`relative flex flex-col rounded-[0.14in] border-[3px] bg-white ${
        poster
          ? "gap-[0.3in] px-[0.45in] pt-[0.55in] pb-[0.35in]"
          : "flex-1 gap-[0.12in] px-[0.35in] pt-[0.35in] pb-[0.2in]"
      }`}
      style={
        {
          borderColor: INK,
          boxShadow: theme.mono ? "none" : `0.09in 0.09in 0 ${theme.accent}`,
          "--pin": poster ? "0.7in" : "0.4in",
        } as CSSProperties
      }
    >
      <Pin color={theme.pin} mono={theme.mono} />
      {poster ? (
        <div className="flex flex-col items-center gap-[0.3in]">
          {words}
          {qr}
        </div>
      ) : (
        <div className="flex flex-1 items-center gap-[0.35in]">
          {qr}
          {words}
        </div>
      )}
      {/* On a tent half the wordmark rides in the card, where the pin above
          can't reach it; a poster has it over the card instead. */}
      <div
        className={`flex items-center gap-[0.2in] ${poster ? "justify-center" : "justify-between"}`}
      >
        <p
          className={poster ? "text-[10.5pt]" : "text-[8.5pt]"}
          style={{ color: "#525252" }}
        >
          {CARD_COPY.footer}
        </p>
        {!poster && <Wordmark width="w-[1.3in]" mono={theme.mono} />}
      </div>
    </div>
  );
}

/** A handful of doodles, drawn in code in the same ink style. */
const DOODLES: Record<string, (color: string) => ReactNode> = {
  star: (color) => (
    <path d="M20 3l5 11 12 1-9 8 3 12-11-7-11 7 3-12-9-8 12-1z" fill={color} />
  ),
  heart: (color) => (
    <path
      d="M20 34S5 24 5 14a7.5 7.5 0 0 1 15-2 7.5 7.5 0 0 1 15 2c0 10-15 20-15 20z"
      fill={color}
    />
  ),
  squiggle: () => (
    <path
      d="M3 22c5-10 9 10 14 0s9 10 14 0 6-4 6-4"
      fill="none"
      strokeLinecap="round"
    />
  ),
  sun: (color) => (
    <g strokeLinecap="round">
      <circle cx="20" cy="20" r="7" fill={color} />
      <path
        d="M20 3v5M20 32v5M3 20h5M32 20h5M8 8l3.5 3.5M28.5 28.5L32 32M8 32l3.5-3.5M28.5 11.5L32 8"
        fill="none"
      />
    </g>
  ),
};

/** Where doodles sit in the margin, as % of the sheet; none reach the card. */
const DOODLE_SPOTS: [keyof typeof DOODLES, number, number, number, string][] = [
  ["star", 3, 2, -12, YELLOW],
  ["sun", 88, 3, 0, YELLOW],
  ["heart", 2, 50, 10, ORANGE],
  ["squiggle", 90, 46, 20, SKY],
  ["star", 90, 90, 15, SKY],
  ["heart", 4, 92, -8, ORANGE],
];

function Doodles({ layout }: { layout: CardLayout }) {
  const poster = layout === "poster";
  return DOODLE_SPOTS.filter(
    // A tent panel is short: only the corner doodles fit around its card.
    ([, , top]) => poster || top < 10 || top > 85,
  ).map(([kind, left, top, turn, color], index) => (
    <svg
      key={index}
      viewBox="0 0 40 40"
      aria-hidden
      className={`absolute ${poster ? "size-[0.55in]" : "size-[0.36in]"}`}
      style={{ left: `${left}%`, top: `${top}%`, rotate: `${turn}deg` }}
      stroke={INK}
      strokeWidth="2.5"
      strokeLinejoin="round"
    >
      {DOODLES[kind](color)}
    </svg>
  ));
}

/** The link-preview card's blue waves, in each corner. */
function Waves({ layout }: { layout: CardLayout }) {
  const width = layout === "poster" ? "w-[2.6in]" : "w-[1.7in]";
  const corners = [
    "top-0 left-0",
    "top-0 right-0 -scale-x-100",
    "bottom-0 left-0 -scale-y-100",
    "right-0 bottom-0 -scale-100",
  ];
  return corners.map((corner) => (
    <svg
      key={corner}
      viewBox="0 0 300 200"
      aria-hidden
      className={`absolute ${width} ${corner}`}
    >
      <path d="M0 0h300c-20 40-60 60-110 70S80 120 60 200H0z" fill="#9cc4f2" />
      <path d="M0 0h240c-15 30-50 45-95 52S50 95 35 150H0z" fill="#3b8ae0" />
      <path d="M0 0h170c-10 22-40 32-75 37S25 70 15 100H0z" fill={BLUE} />
    </svg>
  ));
}

const THEMES = {
  classic: { paper: "#ffffff", accent: BLUE, pin: YELLOW },
  blue: { paper: BLUE, accent: YELLOW, pin: ORANGE, wordmarkTab: true },
  doodle: {
    paper: "#ffffff",
    accent: BLUE,
    pin: ORANGE,
    edge: (layout) => <Doodles layout={layout} />,
  },
  waves: {
    paper: "#ffffff",
    accent: BLUE,
    pin: SKY,
    edge: (layout) => <Waves layout={layout} />,
  },
  ink: { paper: "#ffffff", accent: INK, pin: INK, mono: true },
} satisfies Record<string, Theme>;

/** Every look, in the order the picker shows them. */
export const LOOKS = [
  { id: "classic", label: "Classic" },
  { id: "blue", label: "Blue" },
  { id: "doodle", label: "Doodles" },
  { id: "waves", label: "Waves" },
  { id: "ink", label: "Ink-saver" },
] as const;

export type LookId = (typeof LOOKS)[number]["id"];

/**
 * One card in a given look: the paper, its edge, the wordmark, and the card.
 */
export function Look({
  look,
  name,
  qrSvg,
  layout,
}: {
  look: LookId;
  name: string;
  qrSvg: string;
  layout: CardLayout;
}) {
  const theme: Theme = THEMES[look];
  const poster = layout === "poster";
  return (
    <div
      className={`relative flex size-full flex-col items-stretch overflow-hidden ${
        poster
          ? "gap-[0.35in] px-[0.85in] pt-[0.6in] pb-[0.7in]"
          : "gap-[0.12in] px-[0.55in] pt-[0.45in] pb-[0.3in]"
      }`}
      style={{ backgroundColor: theme.paper }}
    >
      {theme.edge?.(layout)}
      {poster && (
        <div
          className={`relative self-center ${theme.wordmarkTab ? "rounded-[0.18in] bg-white px-[0.25in] py-[0.1in]" : ""}`}
        >
          <Wordmark width="w-[3in]" mono={theme.mono} />
        </div>
      )}
      <div
        className={`relative flex flex-1 flex-col ${poster ? "justify-center" : ""}`}
      >
        <Card name={name} qrSvg={qrSvg} layout={layout} theme={theme} />
      </div>
    </div>
  );
}
