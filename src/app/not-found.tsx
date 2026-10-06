import type { Metadata } from "next";
import { CardPage, INKED_BUTTON } from "@/app/b/[slug]/board-look";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found · DrawPin" };

/**
 * Anything that isn't a page. Next's own 404 is unstyled and says nothing
 * about where you are, which is a poor first impression of a site someone
 * reached by mistyping a link on a phone.
 */
export default function NotFound() {
  return (
    <CardPage
      note="Wrong link"
      title="Page not found"
      intro={<p>That link doesn&apos;t go anywhere on DrawPin.</p>}
    >
      <Link href="/" className={`${INKED_BUTTON} w-full`}>
        Go to the home page
      </Link>
    </CardPage>
  );
}
