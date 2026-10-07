import Link from "next/link";

/**
 * The quiet "Board rules" link at the foot of a board, on every level
 * (ADR-012). Small print, not a badge: the board itself says nothing about
 * its level, and this is for whoever wants to know.
 */
export function BoardRulesLink({ slug }: { slug: string }) {
  return (
    <p className="text-muted-foreground -mt-6 flex justify-center text-sm">
      <Link
        href={`/b/${slug}/rules`}
        className="hover:text-foreground focus-visible:ring-highlight inline-flex min-h-11 items-center rounded-full px-2 underline underline-offset-4 outline-none focus-visible:ring-3"
      >
        Board rules
      </Link>
    </p>
  );
}
