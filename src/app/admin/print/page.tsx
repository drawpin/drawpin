import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { boardUrl, createBoardQrCode } from "@/lib/board";
import { serverEnv } from "@/lib/env";
import { ensureJoinCode } from "@/lib/join-code/ensure";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwnedVenue } from "../venue";
import { LOOKS, type LookId } from "./looks";
import { Preview, PrintButton } from "./preview";
import { PAPER_SIZE, type Paper, type PrintFormat, Sheet } from "./sheet";

export const metadata: Metadata = { title: "Print your QR code · DrawPin" };

const FORMATS: { id: PrintFormat; label: string; hint: string }[] = [
  {
    id: "tent",
    label: "Table tent",
    hint: "Fold along the middle and stand it on a table. It reads the same from both sides.",
  },
  {
    id: "poster",
    label: "Poster",
    hint: "One sheet for a window, a wall or a door.",
  },
];

const PAPERS: { id: Paper; label: string }[] = [
  { id: "letter", label: "Letter" },
  { id: "a4", label: "A4" },
];

function pick<T extends string>(value: unknown, options: readonly T[]): T {
  return options.includes(value as T) ? (value as T) : options[0];
}

/**
 * A printable QR code for the owner's board, in one of five looks, as a
 * folding table tent or a poster. Printing goes through the browser, which
 * also saves a PDF, so the output stays vector at any size.
 */
export default async function PrintPage({
  searchParams,
}: PageProps<"/admin/print">) {
  await connection();

  const venue = await requireOwnedVenue();
  const params = await searchParams;
  const look = pick<LookId>(
    params.look,
    LOOKS.map((each) => each.id),
  );
  const format = pick<PrintFormat>(
    params.format,
    FORMATS.map((each) => each.id),
  );
  const paper = pick<Paper>(
    params.paper,
    PAPERS.map((each) => each.id),
  );
  const [{ svg }, code] = await Promise.all([
    createBoardQrCode(boardUrl(serverEnv().SITE_URL, venue.slug)),
    ensureJoinCode(createAdminClient(), venue.id),
  ]);

  const href = (change: Partial<Record<"look" | "format" | "paper", string>>) =>
    `/admin/print?${new URLSearchParams({ look, format, paper, ...change })}`;
  const chip = (active: boolean) =>
    `border-foreground inline-flex h-10 items-center rounded-full border-2 px-3.5 text-sm font-bold transition-colors duration-150 ease-out ${
      active ? "bg-foreground text-white" : "hover:bg-secondary bg-white"
    }`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      {/* Prints the sheet alone, at its real size, with its colours. */}
      <style>{`
        @page { size: ${PAPER_SIZE[paper].width} ${PAPER_SIZE[paper].height}; margin: 0; }
        @media print {
          body * { visibility: hidden; }
          .print-sheet, .print-sheet * { visibility: visible; }
          .print-frame { height: auto !important; }
          .print-scale { transform: none !important; box-shadow: none !important; }
          .print-sheet { position: fixed; left: 0; top: 0; }
          .print-sheet { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <header className="flex flex-col gap-1 print:hidden">
        <Link
          href="/admin"
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Your board
        </Link>
        <h1 className="text-4xl leading-tight font-black tracking-tight">
          Print your QR code
        </h1>
        <p className="text-muted-foreground text-sm">
          Pick a look and a shape, then print it or save it as a PDF to send to
          a print shop.
        </p>
      </header>

      <section className="flex flex-col gap-4 print:hidden">
        <div className="flex flex-col gap-2">
          <h2 className="font-black tracking-tight">Look</h2>
          <div className="flex flex-wrap gap-2">
            {LOOKS.map((each) => (
              <Link
                key={each.id}
                href={href({ look: each.id })}
                scroll={false}
                className={chip(each.id === look)}
                aria-current={each.id === look ? "true" : undefined}
              >
                {each.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-black tracking-tight">Shape</h2>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((each) => (
              <Link
                key={each.id}
                href={href({ format: each.id })}
                scroll={false}
                className={chip(each.id === format)}
                aria-current={each.id === format ? "true" : undefined}
              >
                {each.label}
              </Link>
            ))}
            <span className="text-muted-foreground mx-1 self-center text-xs">
              on
            </span>
            {PAPERS.map((each) => (
              <Link
                key={each.id}
                href={href({ paper: each.id })}
                scroll={false}
                className={chip(each.id === paper)}
                aria-current={each.id === paper ? "true" : undefined}
              >
                {each.label}
              </Link>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            {FORMATS.find((each) => each.id === format)?.hint} In the print
            dialog, set margins to none and turn on background graphics.
          </p>
        </div>

        <PrintButton />
      </section>

      <Preview key={`${look}-${format}-${paper}`}>
        <Sheet
          look={look}
          format={format}
          paper={paper}
          name={venue.name}
          qrSvg={svg}
          code={code}
        />
      </Preview>
    </main>
  );
}
