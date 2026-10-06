import { BoardLayout, PAPER } from "./board-look";

/** A soft bar standing in for a line of text while it loads. */
function Line({ className }: { className: string }) {
  return <span className={`block rounded-md ${className}`} />;
}

/**
 * What a board's pages show the moment they're opened, before the database
 * has answered (performance pass, 2026-10-06): the board's own frame, with
 * the blue header card and paper where the drawings will go, so the page is
 * there at once and the content fills it in. Next.js streams this first and
 * swaps in the page when it's ready, on a first visit as on a tap from
 * another page. The pulse is off with reduced motion.
 */
export default function BoardLoading() {
  return (
    <div
      role="status"
      aria-label="Loading the board"
      className="flex flex-1 flex-col motion-safe:animate-pulse"
    >
      <BoardLayout
        header={
          <>
            <Line className="h-9 w-3/5 max-w-sm bg-white/30" />
            <Line className="h-4 w-40 bg-white/20" />
            <div className="flex items-center justify-between gap-3">
              <Line className="h-12 w-36 rounded-xl bg-white/15" />
              <Line className="bg-winner/70 h-12 w-28 rounded-xl" />
            </div>
          </>
        }
      >
        <ul className="grid grid-cols-2 gap-x-4 gap-y-12 pt-8 md:grid-cols-3 md:gap-x-8 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} className={`rounded-sm p-2 ${PAPER}`}>
              <span className="bg-secondary block aspect-square w-full" />
              <Line className="bg-secondary mt-3 h-3 w-2/3" />
            </li>
          ))}
        </ul>
      </BoardLayout>
    </div>
  );
}
