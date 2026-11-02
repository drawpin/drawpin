"use client";

import { Toast } from "@base-ui/react/toast";

/**
 * Where the shell's toasts show, such as "Removed {board}." with Undo:
 * bottom centre on a phone, bottom left beside the sidebar on a laptop. An
 * inked white card, like the sidebar; it slides up and fades, instantly under
 * reduced motion.
 */
export function ShellToasts() {
  const { toasts } = Toast.useToastManager();
  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-sm flex-col gap-2 outline-none lg:right-auto lg:left-8 lg:mx-0">
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            toast={toast}
            className="border-foreground text-foreground flex items-center gap-3 rounded-xl border-2 bg-white py-1.5 pr-1.5 pl-4 shadow-[4px_4px_0_var(--primary)] transition-[translate,opacity] duration-200 ease-out data-ending-style:translate-y-2 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0 motion-reduce:transition-none"
          >
            <Toast.Content className="min-w-0 flex-1">
              <Toast.Title className="truncate text-sm font-bold" />
              <Toast.Description className="text-muted-foreground text-xs empty:hidden" />
            </Toast.Content>
            {toast.actionProps && (
              <Toast.Action className="text-primary hover:bg-secondary focus-visible:ring-highlight inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-extrabold outline-none focus-visible:ring-3" />
            )}
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
