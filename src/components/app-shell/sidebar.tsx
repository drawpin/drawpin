"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Toast } from "@base-ui/react/toast";
import { SignInSheet } from "@/components/sign-in-sheet";
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
  const shell = useShell();
  const { setDrawerOpen, setBoards } = shell;
  const toasts = Toast.useToastManager();

  // The list lives in the shell, shared with the board header's pin toggle.
  // A fresh server render (signing in or out, a refresh) replaces it. The
  // tag keeps this sidebar from showing a list from before that render even
  // for the one paint before the effect clears it.
  const [changedFor, setChangedFor] = useState(data);
  const boards =
    shell.boards && changedFor === data ? shell.boards : data.boards;
  useEffect(() => {
    setBoards(null);
  }, [data, setBoards]);
  if (changedFor !== data && shell.boards === null) setChangedFor(data);

  // The sign-in sheet hangs here, outside the drawer: the drawer closes as
  // it opens, and would take a sheet inside it away.
  const [signIn, setSignIn] = useState<{ next: string; open: boolean } | null>(
    null,
  );

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
  }, [slug, setBoards]);

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
      setBoards(boards.filter((other) => other.venueId !== board.venueId));
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
    onSignIn: () => {
      // Read at the tap, so it carries the page's search too. The drawer
      // closes first, so the two dialogs never stack.
      setDrawerOpen(false);
      setSignIn({ next: `${location.pathname}${location.search}`, open: true });
    },
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
      {signIn && (
        <SignInSheet
          next={signIn.next}
          returnTo={boards.find((board) => board.slug === slug)?.name}
          open={signIn.open}
          onOpenChange={(open) => setSignIn({ ...signIn, open })}
        />
      )}
    </>
  );
}
