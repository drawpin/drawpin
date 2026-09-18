import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { JoinForm } from "./join/join-form";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">DrawPin</h1>
      <p className="text-muted-foreground max-w-sm">
        Scan a QR code, draw a tile, and vote for the weekly winner at your
        local spot.
      </p>
      <div className="w-full max-w-xs text-left">
        <JoinForm />
      </div>

      <Link
        href="/login"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Create a board for your venue
      </Link>
    </main>
  );
}
