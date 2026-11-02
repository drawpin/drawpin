import { BoardLayout, PAPER } from "../b/[slug]/board-look";

/** A soft bar standing in for a line of text while it loads. */
function Line({ className }: { className: string }) {
  return <span className={`block rounded-md ${className}`} />;
}

/**
 * The profile's frame while its numbers load: the blue header, four stat
 * cards and paper where the drawings go. The pulse is off with reduced
 * motion.
 */
export default function MeLoading() {
  return (
    <div
      role="status"
      aria-label="Loading your profile"
      className="flex flex-1 flex-col motion-safe:animate-pulse"
    >
      <BoardLayout
        header={
          <>
            <div className="flex items-center gap-4">
              <span className="size-16 shrink-0 rounded-full bg-white/30" />
              <div className="flex flex-col gap-2">
                <Line className="h-9 w-56 bg-white/30" />
                <Line className="h-4 w-36 bg-white/20" />
              </div>
            </div>
            <Line className="h-12 w-44 rounded-xl bg-white/15" />
          </>
        }
      >
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <li
              key={index}
              className="bg-secondary h-20 rounded-xl"
              aria-hidden
            />
          ))}
        </ul>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 pt-6 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} className={`rounded-sm p-2 ${PAPER}`}>
              <span className="bg-secondary block aspect-square w-full" />
            </li>
          ))}
        </ul>
      </BoardLayout>
    </div>
  );
}
