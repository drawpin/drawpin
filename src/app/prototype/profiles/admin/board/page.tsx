import Image from "next/image";
import Link from "next/link";
import {
  ArrowSquareOutIcon,
  CaretDownIcon,
  CheckIcon,
  PlusIcon,
  PrinterIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react/ssr";
import { HEADER_BUTTON, INKED_BUTTON } from "../../../../b/[slug]/board-look";
import { BOARD_CAP, BOARDS } from "../../_proto/data";
import { shellProps } from "../../_proto/params";
import { ShellHeader } from "../../_proto/pages";
import { AppShell } from "../../_proto/shell";

/**
 * PROTOTYPE: one board's admin, with the board switcher in its header. The
 * board's name is the switcher; `?switch=1` shows it open.
 */
export default async function ProtoAdminBoard({
  searchParams,
}: PageProps<"/prototype/profiles/admin/board">) {
  const query = await searchParams;
  const open = query.switch === "1";
  const runs = BOARDS.filter((board) => board.owned);
  const current = runs[0];
  return (
    <AppShell {...shellProps(query)} current="admin">
      <ShellHeader>
        <div className="relative flex flex-col gap-1">
          <p className="text-sm font-bold text-white/85">Your board</p>
          <Link
            href={open ? "?" : "?switch=1"}
            aria-haspopup="menu"
            aria-expanded={open}
            className="focus-visible:ring-highlight -ml-2 inline-flex w-fit max-w-full items-center gap-2 rounded-xl px-2 py-1 outline-none hover:bg-white/10 focus-visible:ring-3"
          >
            <span className="min-w-0 text-4xl leading-[1.02] font-black tracking-tight break-words">
              {current.name}
            </span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/35">
              <CaretDownIcon weight="bold" className="size-5" />
            </span>
          </Link>
          <p className="text-sm text-white/80">drawpin.io/b/{current.slug}</p>
          {open && (
            <div
              role="menu"
              className="border-foreground text-foreground absolute top-full left-0 z-30 mt-2 flex w-[min(20rem,calc(100vw-4rem))] flex-col rounded-xl border-2 bg-white p-1.5 shadow-[5px_5px_0_var(--foreground)]"
            >
              <p className="text-muted-foreground px-2.5 pt-1.5 pb-1 text-xs font-bold">
                Switch board · {runs.length} of {BOARD_CAP}
              </p>
              {runs.map((board) => (
                <Link
                  key={board.slug}
                  href="#"
                  role="menuitemradio"
                  aria-checked={board === current}
                  className="hover:bg-secondary aria-checked:bg-secondary flex h-12 items-center gap-3 rounded-lg px-2.5"
                >
                  <Image
                    src={board.latest[0]}
                    alt=""
                    width={32}
                    height={32}
                    unoptimized
                    className="border-foreground size-8 rounded-md border-2 object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate font-bold">
                    {board.name}
                  </span>
                  {board === current && (
                    <CheckIcon weight="bold" className="text-primary size-5" />
                  )}
                </Link>
              ))}
              <span className="bg-foreground/10 mx-2 my-1 h-0.5" />
              <Link
                href="/prototype/profiles/admin"
                role="menuitem"
                className="hover:bg-secondary flex h-11 items-center gap-3 rounded-lg px-2.5 text-sm font-bold"
              >
                <SquaresFourIcon weight="bold" className="size-5" />
                All your boards
              </Link>
              <Link
                href="#"
                role="menuitem"
                className="hover:bg-secondary flex h-11 items-center gap-3 rounded-lg px-2.5 text-sm font-bold"
              >
                <PlusIcon weight="bold" className="size-5" />
                Start a board
              </Link>
            </div>
          )}
        </div>
        <div>
          <Link href="/prototype/profiles/board" className={HEADER_BUTTON}>
            <ArrowSquareOutIcon weight="bold" className="size-5" />
            Open the board
          </Link>
        </div>
      </ShellHeader>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 pt-10 pb-6">
        <div className="grid items-start gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="mx-auto flex w-full max-w-sm flex-col gap-4 lg:max-w-none">
            <div className="border-foreground flex flex-col items-center gap-3 rounded-xl border-2 bg-white p-5 shadow-[5px_5px_0_var(--primary)]">
              <span className="bg-foreground/90 grid size-40 grid-cols-6 gap-1 rounded-md p-2">
                {Array.from({ length: 36 }, (_, i) => (
                  <span
                    key={i}
                    className={
                      (i * 7) % 3 === 0 ? "bg-white" : "bg-transparent"
                    }
                  />
                ))}
              </span>
              <p className="text-3xl font-black tracking-[0.15em]">4821 0937</p>
            </div>
            <Link href="#" className={INKED_BUTTON}>
              <PrinterIcon weight="bold" className="size-5" />
              Print the table tent
            </Link>
          </aside>
          <section className="border-foreground overflow-hidden rounded-xl border-2 bg-white shadow-[4px_4px_0_var(--primary)]">
            <h2 className="px-5 pt-5 pb-3 font-black tracking-tight">
              This week&apos;s drawings
            </h2>
            <ul className="grid grid-cols-3 gap-2 px-5 pb-5 sm:grid-cols-4">
              {[...BOARDS[0].latest, ...BOARDS[1].latest].map((url, index) => (
                <li key={url + index}>
                  <Image
                    src={url}
                    alt=""
                    width={160}
                    height={160}
                    unoptimized
                    className="border-foreground/15 aspect-square w-full rounded-md border object-cover"
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
