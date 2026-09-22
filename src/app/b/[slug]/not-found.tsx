import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function BoardNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Board not found
        </h1>
        <p className="text-muted-foreground max-w-sm">
          Check the link, or scan the QR code at the venue again.
        </p>
      </div>
      {/* A stale link is the likeliest way anyone gets here, and the code on
          the counter is the way out of it. */}
      <Link href="/#join" className={buttonVariants()}>
        Open a board with a code
      </Link>
    </main>
  );
}
