import type { ReactNode } from "react";
import { CaretDownIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

/**
 * One row of the owner page's Board settings: the setting's name and what
 * it's set to, opening in place to the full control. A native `<details>`,
 * so it opens with a tap, Enter or Space without any script, and several can
 * be open at once.
 *
 * @param title - The setting's name, also the row's heading.
 * @param summary - Its current value, one line, cut short if it's long.
 * @param danger - For closing the board: the row reads in red.
 */
export function SettingsShelf({
  id,
  title,
  summary,
  danger = false,
  children,
}: {
  id: string;
  title: string;
  summary?: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <details id={id} className="group/shelf border-foreground border-t-2">
      <summary
        className={cn(
          "focus-visible:ring-highlight flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 outline-none focus-visible:ring-3 focus-visible:ring-inset [&::-webkit-details-marker]:hidden",
          "hover:bg-secondary transition-colors duration-150 ease-out motion-reduce:transition-none",
          danger && "text-destructive",
        )}
      >
        <h3 className="shrink-0 font-black tracking-tight">{title}</h3>
        {summary && (
          <span
            className={cn(
              "min-w-0 truncate text-sm",
              danger ? "text-destructive/80" : "text-muted-foreground",
            )}
          >
            {summary}
          </span>
        )}
        <CaretDownIcon
          weight="bold"
          aria-hidden
          className="ml-auto size-5 shrink-0 transition-transform duration-200 ease-out group-open/shelf:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="animate-in fade-in slide-in-from-top-1 px-5 pt-1 pb-5 duration-200 ease-out motion-reduce:animate-none">
        {children}
      </div>
    </details>
  );
}
