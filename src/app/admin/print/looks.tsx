import Image from "next/image";
import type { ReactNode } from "react";
import { Caveat } from "next/font/google";

/** The handwriting used for headlines on the printed card. */
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
  private: "Our own board, just for the people here.",
  footer: "No camera? Go to drawpin.io and type today's code.",
} as const;

/**
 * A card is printed whole on a poster, or as a landscape half-sheet twice
 * over on a folding table tent.
 */
export type CardLayout = "poster" | "panel";

export type LookProps = {
  name: string;
  /** The board's QR code as SVG markup, generated from our own URL. */
  qrSvg: string;
  layout: CardLayout;
};

/** Long board names step down a size so they never push the QR off. */
function nameSize(name: string, layout: CardLayout): string {
  const long = name.length > 28;
  if (layout === "poster") return long ? "text-[26pt]" : "text-[36pt]";
  return long ? "text-[17pt]" : "text-[22pt]";
}

function Qr({
  svg,
  layout,
  className = "",
}: {
  svg: string;
  layout: CardLayout;
  className?: string;
}) {
  return (
    <div
      // The SVG is generated server-side by the qrcode library from our own
      // board URL, so it contains no user-controlled markup.
      dangerouslySetInnerHTML={{ __html: svg }}
      className={`shrink-0 bg-white [&_svg]:block [&_svg]:size-full ${
        layout === "poster"
          ? "size-[4.1in] p-[0.1in]"
          : "size-[3.3in] p-[0.08in]"
      } ${className}`}
    />
  );
}

/** The words, laid out for the card's shape. Colours come from the look. */
function Words({
  layout,
  name,
  showName = true,
  headline = CARD_COPY.headline,
  detail = CARD_COPY.detail,
  classes,
}: {
  layout: CardLayout;
  name: string;
  showName?: boolean;
  headline?: string;
  detail?: string;
  classes: {
    name?: string;
    headline: string;
    detail: string;
    private: string;
    footer: string;
  };
}) {
  const poster = layout === "poster";
  return (
    <div
      className={`flex min-w-0 flex-col ${poster ? "items-center gap-[0.12in] text-center" : "gap-[0.08in]"}`}
    >
      {showName && (
        <p
          className={`leading-tight font-black tracking-tight text-balance break-words ${nameSize(name, layout)} ${classes.name ?? ""}`}
        >
          {name}
        </p>
      )}
      <p
        className={`leading-[0.95] text-balance ${poster ? "text-[44pt]" : "text-[28pt]"} ${classes.headline}`}
      >
        {headline}
      </p>
      <p
        className={`font-semibold text-balance ${poster ? "text-[17pt]" : "text-[12.5pt]"} ${classes.detail}`}
      >
        {detail}
      </p>
      <p
        className={`text-balance ${poster ? "text-[13pt]" : "text-[10.5pt]"} ${classes.private}`}
      >
        {CARD_COPY.private}
      </p>
      <p
        className={`${poster ? "text-[10.5pt]" : "text-[8.5pt]"} ${classes.footer}`}
      >
        {CARD_COPY.footer}
      </p>
    </div>
  );
}

/**
 * The QR and the words, stacked on a poster and side by side on a tent
 * panel, where the QR sits on the left so it faces the person reading.
 */
function Body({
  layout,
  qr,
  words,
}: {
  layout: CardLayout;
  qr: ReactNode;
  words: ReactNode;
}) {
  return layout === "poster" ? (
    <div className="flex flex-1 flex-col items-center justify-center gap-[0.3in]">
      {qr}
      {words}
    </div>
  ) : (
    <div className="flex flex-1 items-center gap-[0.35in]">
      {qr}
      {words}
    </div>
  );
}

/** A round tack seen from above, as on the board. */
function Tack({ size }: { size: string }) {
  return (
    <svg viewBox="0 0 40 40" className={size} aria-hidden>
      <ellipse cx="23" cy="25" rx="15" ry="13" fill={INK} opacity="0.25" />
      <circle
        cx="20"
        cy="20"
        r="15"
        fill={YELLOW}
        stroke={INK}
        strokeWidth="2.5"
      />
      <circle cx="20" cy="20" r="7" fill="#ffe08a" />
      <ellipse
        cx="15"
        cy="14"
        rx="4"
        ry="2.5"
        fill="white"
        transform="rotate(-25 15 14)"
      />
    </svg>
  );
}

/** Pinned: the board's own look, a white card on a tack under a blue header. */
export function PinnedLook({ name, qrSvg, layout }: LookProps) {
  const poster = layout === "poster";
  return (
    <div
      className={`flex size-full flex-col bg-white ${poster ? "p-[0.5in]" : "p-[0.3in]"}`}
    >
      <div
        className="relative flex flex-1 flex-col rounded-[0.12in] border-[3px] bg-white"
        style={{ borderColor: INK, boxShadow: `0.08in 0.08in 0 ${BLUE}` }}
      >
        <div
          className={`absolute left-1/2 -translate-x-1/2 ${poster ? "-top-[0.32in]" : "-top-[0.25in]"}`}
        >
          <Tack size={poster ? "size-[0.6in]" : "size-[0.45in]"} />
        </div>
        <div
          className={`rounded-t-[0.09in] border-b-[3px] text-center text-white ${poster ? "px-[0.4in] pt-[0.4in] pb-[0.25in]" : "px-[0.3in] pt-[0.25in] pb-[0.12in]"}`}
          style={{ backgroundColor: BLUE, borderColor: INK }}
        >
          <p
            className={`leading-tight font-black tracking-tight text-balance break-words ${nameSize(name, layout)}`}
          >
            {name}
          </p>
        </div>
        <div className={`flex flex-1 ${poster ? "p-[0.35in]" : "p-[0.25in]"}`}>
          <Body
            layout={layout}
            qr={
              <Qr
                svg={qrSvg}
                layout={layout}
                className="rounded-[0.06in] border-[3px] border-[#0f1b2d]"
              />
            }
            words={
              <Words
                layout={layout}
                name={name}
                showName={false}
                classes={{
                  headline: `${hand.className} font-bold text-[#004aad]`,
                  detail: "text-[#0f1b2d]",
                  private: "text-[#ff821b] font-semibold",
                  footer: "text-[#525252]",
                }}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}

/** Ink-saver: black line work on white, for any office printer. */
export function InkSaverLook({ name, qrSvg, layout }: LookProps) {
  const poster = layout === "poster";
  return (
    <div
      className={`flex size-full flex-col bg-white ${poster ? "p-[0.5in]" : "p-[0.3in]"}`}
    >
      <div
        className={`flex flex-1 flex-col rounded-[0.15in] border-[1.5px] border-dashed ${poster ? "p-[0.45in]" : "p-[0.25in]"}`}
        style={{ borderColor: INK }}
      >
        <Body
          layout={layout}
          qr={
            <Qr
              svg={qrSvg}
              layout={layout}
              className="rounded-[0.08in] border-[1.5px] border-black"
            />
          }
          words={
            <Words
              layout={layout}
              name={name}
              classes={{
                name: "text-black",
                headline: `${hand.className} font-bold text-black`,
                detail: "text-black",
                private: "text-[#525252] italic",
                footer: "text-[#525252]",
              }}
            />
          }
        />
      </div>
    </div>
  );
}

/** Bold: full blue with a big yellow headline, readable across a room. */
export function BoldLook({ name, qrSvg, layout }: LookProps) {
  const poster = layout === "poster";
  return (
    <div
      className={`flex size-full flex-col ${poster ? "p-[0.55in]" : "p-[0.3in]"}`}
      style={{ backgroundColor: BLUE }}
    >
      {poster && (
        <p
          className="text-center text-[78pt] leading-[0.9] font-black tracking-tight uppercase"
          style={{ color: YELLOW }}
        >
          Scan to draw!
        </p>
      )}
      <Body
        layout={layout}
        qr={
          <Qr
            svg={qrSvg}
            layout={layout}
            className="rounded-[0.18in] border-[4px] border-[#0f1b2d]"
          />
        }
        words={
          <Words
            layout={layout}
            name={name}
            headline={poster ? "Join the drawing board!" : "Scan to draw!"}
            classes={{
              name: "text-white",
              headline: poster
                ? "font-black text-white text-[30pt]!"
                : "font-black uppercase text-[#ffca39]",
              detail: "text-white",
              private: "text-[#ffca39] font-bold",
              footer: "text-white/80",
            }}
          />
        }
      />
    </div>
  );
}

/** A handful of doodles, drawn in code so they stay crisp at any size. */
const DOODLES: Record<string, (color: string) => ReactNode> = {
  star: (color) => (
    <path
      d="M20 3l5 11 12 1-9 8 3 12-11-7-11 7 3-12-9-8 12-1z"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  ),
  heart: (color) => (
    <path
      d="M20 34S5 24 5 14a7.5 7.5 0 0 1 15-2 7.5 7.5 0 0 1 15 2c0 10-15 20-15 20z"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  ),
  squiggle: (color) => (
    <path
      d="M3 22c5-10 9 10 14 0s9 10 14 0 6-4 6-4"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  ),
  sun: (color) => (
    <g fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <circle cx="20" cy="20" r="7" />
      <path d="M20 3v5M20 32v5M3 20h5M32 20h5M8 8l3.5 3.5M28.5 28.5L32 32M8 32l3.5-3.5M28.5 11.5L32 8" />
    </g>
  ),
  pencil: (color) => (
    <g fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round">
      <path d="M8 32l3-9L28 6l6 6-17 17z" />
      <path d="M11 23l6 6M25 9l6 6" />
    </g>
  ),
};

/** Where doodles sit around a card's edge, as % of its width and height. */
const DOODLE_SPOTS: [keyof typeof DOODLES, number, number, number, string][] = [
  ["star", 4, 3, -12, BLUE],
  ["sun", 86, 4, 0, YELLOW],
  ["heart", 6, 46, 10, ORANGE],
  ["pencil", 87, 40, 20, SKY],
  ["squiggle", 40, 1, 0, SKY],
  ["star", 88, 78, 15, ORANGE],
  ["squiggle", 8, 88, 0, BLUE],
  ["heart", 60, 92, -8, BLUE],
  ["sun", 30, 92, 0, ORANGE],
  ["pencil", 3, 70, -30, YELLOW],
];

/** Doodle: a playful hand-drawn frame around a clean centre. */
export function DoodleLook({ name, qrSvg, layout }: LookProps) {
  const poster = layout === "poster";
  return (
    <div
      className={`relative flex size-full flex-col bg-white ${poster ? "p-[0.95in]" : "p-[0.55in]"}`}
    >
      {DOODLE_SPOTS.filter(
        // A tent panel is wide and short: doodles at its sides would sit on
        // the QR, so it keeps the ones along the top and bottom.
        ([, , top]) => poster || top < 10 || top > 85,
      ).map(([kind, left, top, turn, color], index) => (
        <svg
          key={index}
          viewBox="0 0 40 40"
          aria-hidden
          className={`absolute ${poster ? "size-[0.7in]" : "size-[0.45in]"}`}
          style={{ left: `${left}%`, top: `${top}%`, rotate: `${turn}deg` }}
        >
          {DOODLES[kind](color)}
        </svg>
      ))}
      <Body
        layout={layout}
        qr={
          <Qr
            svg={qrSvg}
            layout={layout}
            className="rounded-[0.3in] border-[3px] border-[#0f1b2d] p-[0.18in]!"
          />
        }
        words={
          <Words
            layout={layout}
            name={name}
            classes={{
              name: "text-[#0f1b2d]",
              headline: `${hand.className} font-bold text-[#004aad]`,
              detail: "text-[#0f1b2d]",
              private: `${hand.className} font-bold text-[#ff821b] ${poster ? "text-[20pt]!" : "text-[15pt]!"}`,
              footer: "text-[#525252]",
            }}
          />
        }
      />
    </div>
  );
}

/** Layered blue waves for a corner, like the link-preview card. */
function Waves({ className, flip }: { className: string; flip: string }) {
  return (
    <svg
      viewBox="0 0 300 200"
      aria-hidden
      className={`absolute ${className}`}
      style={{ transform: flip }}
    >
      <path d="M0 0h300c-20 40-60 60-110 70S80 120 60 200H0z" fill="#9cc4f2" />
      <path d="M0 0h240c-15 30-50 45-95 52S50 95 35 150H0z" fill="#3b8ae0" />
      <path d="M0 0h170c-10 22-40 32-75 37S25 70 15 100H0z" fill={BLUE} />
    </svg>
  );
}

/** Cover: the link-preview card's wordmark and blue waves. */
export function CoverLook({ name, qrSvg, layout }: LookProps) {
  const poster = layout === "poster";
  const wave = poster ? "w-[3.2in]" : "w-[2.2in]";
  return (
    <div
      className={`relative flex size-full flex-col overflow-hidden bg-white ${poster ? "px-[0.8in] py-[1.3in]" : "px-[0.6in] py-[0.45in]"}`}
    >
      <Waves className={`top-0 left-0 ${wave}`} flip="none" />
      <Waves className={`top-0 right-0 ${wave}`} flip="scaleX(-1)" />
      <Waves className={`bottom-0 left-0 ${wave}`} flip="scaleY(-1)" />
      <Waves className={`right-0 bottom-0 ${wave}`} flip="scale(-1)" />
      <div className="relative flex flex-1 flex-col">
        {poster && (
          <Image
            src="/print-wordmark.png"
            alt="DrawPin"
            width={625}
            height={200}
            className="mx-auto mb-[0.15in] w-[3.6in]"
          />
        )}
        <Body
          layout={layout}
          qr={
            <Qr
              svg={qrSvg}
              layout={layout}
              className="rounded-[0.12in] border-[3px] border-[#004aad]"
            />
          }
          words={
            <Words
              layout={layout}
              name={name}
              classes={{
                name: "text-[#004aad]",
                headline: `${hand.className} font-bold text-[#0f1b2d]`,
                detail: "text-[#0f1b2d]",
                private: "text-[#004aad] font-semibold",
                footer: "text-[#525252]",
              }}
            />
          }
        />
      </div>
    </div>
  );
}

/** Every look, in the order the picker shows them. */
export const LOOKS = [
  { id: "pinned", label: "Pinned", Look: PinnedLook },
  { id: "ink", label: "Ink-saver", Look: InkSaverLook },
  { id: "bold", label: "Bold", Look: BoldLook },
  { id: "doodle", label: "Doodle", Look: DoodleLook },
  { id: "cover", label: "Cover", Look: CoverLook },
] as const;

export type LookId = (typeof LOOKS)[number]["id"];
