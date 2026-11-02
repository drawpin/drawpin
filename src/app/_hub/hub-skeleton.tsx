import { BoardLayout } from "../b/[slug]/board-look";

/** A soft bar standing in for a line of text while it loads. */
function Line({ className }: { className: string }) {
  return <span className={`block rounded-md ${className}`} />;
}

/**
 * The hub while its boards load: the blue header, then grey cards where
 * the Today cards and the boards go. The pulse is off with reduced motion.
 */
export function HubSkeleton({ name }: { name: string }) {
  return (
    <div
      role="status"
      aria-label="Loading your boards"
      className="flex flex-1 flex-col"
    >
      <BoardLayout
        header={
          <>
            <Line className="h-5 w-40 bg-white/20" />
            <p className="-mt-2 text-4xl leading-[1.02] font-black tracking-tight break-words sm:text-5xl">
              Hi, {name}.
            </p>
            <Line className="h-7 w-72 max-w-full bg-white/20" />
          </>
        }
      >
        <div className="flex flex-col gap-12 motion-safe:animate-pulse">
          <ul className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-4">
            {[0, 1].map((card) => (
              <li
                key={card}
                aria-hidden
                className="border-secondary h-48 rounded-xl border-2"
              />
            ))}
          </ul>
          <ul className="-mx-5 flex gap-5 overflow-hidden px-5 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 xl:grid-cols-3">
            {[0, 1, 2].map((card) => (
              <li
                key={card}
                aria-hidden
                className="bg-secondary h-56 w-[78%] shrink-0 rounded-xl sm:w-auto"
              />
            ))}
          </ul>
        </div>
      </BoardLayout>
    </div>
  );
}
