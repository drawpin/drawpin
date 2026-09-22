import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found · DrawPin" };

/**
 * Anything that isn't a page. Next's own 404 is unstyled and says nothing
 * about where you are, which is a poor first impression of a site someone
 * reached by mistyping a link on a phone.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="text-muted-foreground max-w-sm">
          That link doesn&apos;t go anywhere on DrawPin.
        </p>
      </div>
      <Link href="/" className={buttonVariants()}>
        Go to the home page
      </Link>
    </main>
  );
}
