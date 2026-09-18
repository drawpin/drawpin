import type { Metadata } from "next";
import { connection } from "next/server";
import { Button, buttonVariants } from "@/components/ui/button";
import { boardUrl, createBoardQrCode } from "@/lib/board";
import { ensureDailyCode } from "@/lib/daily-code/ensure";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { setBoardPaused, signOut } from "./actions";
import { BoardTiles } from "./board-tiles";
import { ReportedTiles } from "./reported-tiles";
import { listBoardTiles, listReportedTiles, requireOwnedVenue } from "./venue";

export const metadata: Metadata = { title: "Your board · DrawPin" };

export default async function AdminPage() {
  // The board's state changes as customers post, so never serve a cached copy.
  await connection();

  const venue = await requireOwnedVenue();
  const url = boardUrl(serverEnv().SITE_URL, venue.slug);
  const [qr, tiles, code, reported] = await Promise.all([
    createBoardQrCode(url),
    listBoardTiles(venue.id),
    // Created on the first view of the day, so it exists before anyone is
    // told it (ADR-003).
    ensureDailyCode(createAdminClient(), venue),
    listReportedTiles(venue.id),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Your board</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {venue.name}
          </h1>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </header>

      <section className="flex flex-col items-center gap-4">
        {/* The SVG is generated server-side by the qrcode library from our own
            board URL, so it contains no user-controlled markup. */}
        <div
          role="img"
          aria-label={`QR code for ${url}`}
          className="w-full max-w-64 rounded-xl border bg-white p-2"
          dangerouslySetInnerHTML={{ __html: qr.svg }}
        />
        <a
          href={qr.pngDataUrl}
          download={`drawpin-${venue.slug}-qr.png`}
          className={buttonVariants({ size: "lg", className: "w-full" })}
        >
          Download QR code to print
        </a>
      </section>

      {/* First thing on the screen when there is one: it is the only part
          that needs the owner to do something. */}
      <ReportedTiles tiles={reported} />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Today&apos;s code</h2>
        <p className="bg-muted rounded-lg px-3 py-2 text-center font-mono text-2xl tracking-[0.3em]">
          {code}
        </p>
        <p className="text-muted-foreground text-xs">
          Customers who can&apos;t scan can type this on the DrawPin home page.
          It changes every morning at 4:00 AM.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Board link</h2>
        <p className="bg-muted rounded-lg px-3 py-2 font-mono text-sm break-all">
          {url}
        </p>
        <p className="text-muted-foreground text-xs">
          Customers open this link by scanning the QR code.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">
          {venue.isPaused ? "Board paused" : "Board open"}
        </h2>
        <p className="text-muted-foreground text-xs">
          {venue.isPaused
            ? "Customers can see the board but can't post."
            : "Customers can post to the board."}
        </p>
        <form action={setBoardPaused}>
          <input
            type="hidden"
            name="paused"
            value={venue.isPaused ? "false" : "true"}
          />
          <Button
            type="submit"
            variant={venue.isPaused ? "default" : "outline"}
            size="sm"
          >
            {venue.isPaused ? "Resume posting" : "Pause board"}
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">This week&apos;s drawings</h2>
        <p className="text-muted-foreground text-xs">
          Removing a drawing takes it off the board for everyone and deletes it.
          This can&apos;t be undone.
        </p>
        <BoardTiles tiles={tiles} />
      </section>
    </main>
  );
}
