import { PencilSimpleIcon } from "@phosphor-icons/react/ssr";
import { hand } from "@/lib/fonts";

/**
 * The card a board's owner puts out (UI pass, 2026-10-05): the board's name,
 * an invitation, the QR and the address, in the boards' own look, so a café
 * can put it on a table without designing anything. The day's code isn't on
 * it: it changes every morning, and a printed card can't.
 */
export function QrCard({
  name,
  url,
  svg,
}: {
  name: string;
  url: string;
  /** The QR as SVG markup, generated server-side from our own URL. */
  svg: string;
}) {
  const address = url.replace(/^https?:\/\//, "");
  return (
    <div className="print-card border-foreground mx-auto flex w-full max-w-72 flex-col items-center gap-3 rounded-xl border-2 bg-white px-5 pt-5 pb-4 text-center shadow-[5px_5px_0_var(--primary)]">
      <p
        className={`${hand.className} bg-winner text-foreground -rotate-2 rounded-sm px-3 py-0.5 text-2xl leading-tight font-bold`}
      >
        Scan to draw!
      </p>
      <h2 className="text-foreground text-2xl leading-tight font-black tracking-tight break-words">
        {name}
      </h2>
      {/* The SVG is generated server-side by the qrcode library from our own
          board URL, so it contains no user-controlled markup. */}
      <div
        role="img"
        aria-label={`QR code for ${url}`}
        className="w-full max-w-56"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="text-muted-foreground flex items-center gap-1.5 text-sm font-semibold">
        <PencilSimpleIcon weight="bold" className="text-primary size-4" />
        Draw one, vote for the best
      </p>
      <p className="text-muted-foreground font-mono text-xs break-all">
        {address}
      </p>
    </div>
  );
}
