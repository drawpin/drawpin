import type { ReactNode } from "react";

/**
 * One cell of the draw screen's tool grid: an icon over its name, at least
 * 56px tall so a thumb can't miss it.
 *
 * The tool in hand (`pressed`) and a tool whose panel is open (`expanded`)
 * both show in the primary blue on the tint. The 1px inset shadow thickens
 * the border to 2px without the cell changing size.
 *
 * Tools are tapped hundreds of times a drawing, so they get press feedback
 * and nothing slower: a quick squeeze on the way down.
 */
export function ToolButton({
  icon,
  label,
  pressed,
  expanded,
  ariaLabel,
  title,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  pressed?: boolean;
  expanded?: boolean;
  /** When the visible label isn't enough, e.g. the brush size's value. */
  ariaLabel?: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
      className="border-border bg-background text-foreground hover:bg-accent focus-visible:ring-highlight aria-pressed:border-primary aria-pressed:bg-secondary aria-pressed:text-primary aria-expanded:border-primary aria-expanded:bg-secondary aria-expanded:text-primary flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 text-xs font-semibold transition-[background-color,border-color,color,transform] duration-100 ease-out outline-none focus-visible:ring-3 active:scale-[0.96] disabled:cursor-default disabled:opacity-50 aria-expanded:shadow-[inset_0_0_0_1px_var(--primary)] aria-pressed:shadow-[inset_0_0_0_1px_var(--primary)] motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:size-6"
    >
      {icon}
      {label}
    </button>
  );
}
