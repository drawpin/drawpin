/**
 * The draw page's frame while it loads (performance pass, 2026-10-06): the
 * title, the inked tool bar and canvas and the colours, laid out as the
 * page will be, so opening Draw shows something at once and nothing jumps
 * when the page arrives. The pulse is off with reduced motion.
 */
export default function DrawLoading() {
  return (
    <div
      role="status"
      aria-label="Loading the drawing board"
      className="flex flex-1 flex-col motion-safe:animate-pulse"
    >
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
        <div className="flex items-center gap-3">
          <span className="bg-secondary size-11 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <span className="bg-secondary block h-6 w-32 rounded-md" />
            <span className="bg-secondary block h-4 w-24 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5 pt-12">
          <span className="border-foreground block h-96 w-14 rounded-[18px] border-2 bg-white shadow-[3px_3px_0_var(--foreground)]" />
          <span className="border-foreground block aspect-square w-full rounded-xl border-2 bg-white shadow-[4px_4px_0_var(--primary)]" />
        </div>
        <div className="grid grid-cols-8 gap-1 pt-4">
          {Array.from({ length: 8 }, (_, index) => (
            <span
              key={index}
              className="bg-secondary aspect-square w-full rounded-full"
            />
          ))}
        </div>
        <span className="bg-winner/60 mt-2 block h-12 w-full rounded-xl" />
      </main>
    </div>
  );
}
