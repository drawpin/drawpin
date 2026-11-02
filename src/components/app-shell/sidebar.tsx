"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Toast } from "@base-ui/react/toast";
import {
  pinBoardAction,
  removeBoardAction,
  type SidebarActionResult,
  undoRemoveBoardAction,
  unpinBoardAction,
  visitBoard,
} from "./actions";
import { boardSlugFromPath } from "./chrome";
import { LeaveGuard } from "./guarded-link";
import type { SidebarData } from "./load-sidebar";
import { type BoardHandlers, SidebarContents } from "./sidebar-contents";
import { SidebarDrawer } from "./sidebar-drawer";
import { useShell } from "./shell-frame";

const TRY_AGAIN = "That didn't work. Try again.";

/**
 * The sidebar's one instance: the laptop column's card and the phone
 * drawer, sharing one list of boards so a pin or remove in either shows in
 * both. It also remembers each board the person opens (`visitBoard`), and
 * takes the list that comes back, since the root layout it lives in doesn't
 * re-render as they move between pages.
 */
export function Sidebar({ data }: { data: SidebarData }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setDrawerOpen } = useShell();
  const toasts = Toast.useToastManager();

  const [boards, setBoards] = useState(data.boards);
  // A fresh server render (signing in or out, a refresh) replaces the list.
  const [loaded, setLoaded] = useState(data);
  if (loaded !== data) {
    setLoaded(data);
    setBoards(data.boards);
  }

  const slug = boardSlugFromPath(pathname);
  useEffect(() => {
    if (!slug) return;
    let stale = false;
    visitBoard({ slug })
      .then((result) => {
        if (!stale && result?.ok) setBoards(result.boards);
      })
      // Remembering is a convenience: the page works without it.
      .catch((error: unknown) => console.error(error));
    return () => {
      stale = true;
    };
  }, [slug]);

  /** Runs an action, taking its list, or saying why it didn't work. */
  async function run(action: Promise<SidebarActionResult>): Promise<boolean> {
    try {
      const result = await action;
      if (result.ok) {
        setBoards(result.boards);
        return true;
      }
      toasts.add({ title: result.message });
    } catch (error) {
      console.error(error);
      toasts.add({ title: TRY_AGAIN });
    }
    return false;
  }

  const handlers: BoardHandlers = {
    onPin: (board) => void run(pinBoardAction({ venueId: board.venueId })),
    onUnpin: (board) => void run(unpinBoardAction({ venueId: board.venueId })),
    onRemove: (board) => {
      // The row leaves at once; the server's list follows.
      setBoards((current) =>
        current.filter((other) => other.venueId !== board.venueId),
      );
      void run(removeBoardAction({ venueId: board.venueId })).then((ok) => {
        if (!ok) return;
        const id = toasts.add({
          title: `Removed ${board.name}.`,
          actionProps: {
            children: "Undo",
            onClick: () => {
              toasts.close(id);
              void run(
                undoRemoveBoardAction({
                  venueId: board.venueId,
                  slug: board.slug,
                  lastVisitedAt: board.lastVisitedAt,
                  pinnedAt: board.pinnedAt,
                }),
              );
            },
          },
        });
      });
    },
    onRetry: () => router.refresh(),
  };

  const close = () => setDrawerOpen(false);
  return (
    <>
      <div className="border-foreground text-foreground h-full overflow-y-auto overscroll-contain rounded-2xl border-2 bg-white shadow-[6px_6px_0_var(--primary)]">
        <LeaveGuard>
          <SidebarContents
            data={data}
            boards={boards}
            currentPath={pathname}
            handlers={handlers}
          />
        </LeaveGuard>
      </div>
      <SidebarDrawer>
        <LeaveGuard onNavigate={close}>
          <SidebarContents
            data={data}
            boards={boards}
            currentPath={pathname}
            handlers={handlers}
            onClose={close}
          />
        </LeaveGuard>
      </SidebarDrawer>
    </>
  );
}
