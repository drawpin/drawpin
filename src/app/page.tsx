import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">DrawPin</h1>
      <p className="text-muted-foreground max-w-sm">
        Scan a QR code, draw a tile, and vote for the weekly winner at your
        local spot.
      </p>
      <Link href="/login" className={buttonVariants({ size: "lg" })}>
        Create a board for your venue
      </Link>
    </main>
  );
}
