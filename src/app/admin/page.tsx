import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireOwner } from "@/lib/auth";
import { boardUrl, createBoardQrCode } from "@/lib/board";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Your board · DrawPin" };

export default async function AdminPage() {
  const owner = await requireOwner();

  const supabase = await createClient();
  const { data: venue, error } = await supabase
    .from("venues")
    .select("name, slug")
    .eq("owner_id", owner.id)
    .maybeSingle();

  if (error) throw new Error(`Could not load venue: ${error.message}`);
  if (!venue) redirect("/setup");

  const url = boardUrl(serverEnv().SITE_URL, venue.slug);
  const qr = await createBoardQrCode(url);

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

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Board link</h2>
        <p className="bg-muted rounded-lg px-3 py-2 font-mono text-sm break-all">
          {url}
        </p>
        <p className="text-muted-foreground text-xs">
          Customers open this link by scanning the QR code.
        </p>
      </section>
    </main>
  );
}
