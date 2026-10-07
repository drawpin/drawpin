/**
 * The Save button that sits inside a settings field at its right end, shown
 * only once the field differs from what's saved (rename, time zone).
 *
 * The field it sits in keeps `INLINE_SAVE_ROOM` as right padding while it
 * shows, so what's typed doesn't run under it, and is `h-14` so the 44px
 * button fits inside the border.
 *
 * @param label - What it saves, for screen readers: "Save" is seen,
 *   "Save name" is heard.
 * @param pending - Whether the save is under way.
 */
export function InlineSave({
  label,
  pending,
}: {
  label: string;
  pending: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="border-foreground bg-winner text-foreground focus-visible:ring-highlight animate-in fade-in zoom-in-95 absolute top-1/2 right-1.5 inline-flex h-11 -translate-y-1/2 cursor-pointer items-center rounded-lg border-2 px-3.5 text-sm font-extrabold transition-[scale,background-color] duration-150 ease-out outline-none hover:bg-[color-mix(in_oklch,var(--winner),var(--foreground)_6%)] focus-visible:ring-3 active:scale-[0.97] disabled:cursor-default disabled:opacity-70 motion-reduce:animate-none motion-reduce:transition-none"
    >
      {pending ? (
        "Saving…"
      ) : (
        <>
          Save<span className="sr-only"> {label}</span>
        </>
      )}
    </button>
  );
}

/** The right padding a field keeps while `InlineSave` shows in it. */
export const INLINE_SAVE_ROOM = "pr-28";
