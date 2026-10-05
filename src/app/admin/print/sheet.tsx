import { type CardLayout, Look, type LookId } from "./looks";

export type PrintFormat = "tent" | "poster";
export type Paper = "letter" | "a4";

/** Sheet sizes, portrait. */
export const PAPER_SIZE: Record<Paper, { width: string; height: string }> = {
  letter: { width: "8.5in", height: "11in" },
  a4: { width: "210mm", height: "297mm" },
};

/**
 * One printable sheet. A poster is the card once, full page. A table tent is
 * the card twice, as landscape halves: fold along the middle and stand it up,
 * and the top half (printed upside down) faces the other way.
 */
export function Sheet({
  look,
  format,
  paper,
  name,
  qrSvg,
}: {
  look: LookId;
  format: PrintFormat;
  paper: Paper;
  name: string;
  qrSvg: string;
}) {
  const size = PAPER_SIZE[paper];
  const card = (layout: CardLayout) => (
    <Look look={look} name={name} qrSvg={qrSvg} layout={layout} />
  );

  return (
    <div
      className="print-sheet relative overflow-hidden bg-white text-[#0f1b2d]"
      style={{ width: size.width, height: size.height }}
    >
      {format === "poster" ? (
        card("poster")
      ) : (
        <div className="flex size-full flex-col">
          <div className="h-1/2 rotate-180">{card("panel")}</div>
          {/* Where to fold. Faint, so it doesn't show once folded. */}
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#0f1b2d]/25" />
          <div className="h-1/2">{card("panel")}</div>
        </div>
      )}
    </div>
  );
}
