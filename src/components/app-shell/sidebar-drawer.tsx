"use client";

import type { ReactNode } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { useShell } from "./shell-frame";

/**
 * The sidebar as a drawer from the left, for phones and tablets and for the
 * draw step (Base UI `Drawer`: focus trap, Escape, scroll lock, focus back to
 * the menu button). Only the menu button opens it: there's no edge swipe
 * area, because the draw canvas and iOS's back gesture own sideways drags.
 * Swiping the open drawer left closes it.
 */
export function SidebarDrawer({ children }: { children: ReactNode }) {
  const { drawerOpen, setDrawerOpen } = useShell();
  return (
    <Drawer.Root
      open={drawerOpen}
      onOpenChange={setDrawerOpen}
      swipeDirection="left"
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="bg-foreground/40 fixed inset-0 z-40 transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-stretch justify-start">
          <Drawer.Popup
            // First focus on Close (spec, section 9), not the first link.
            initialFocus={() =>
              document.querySelector<HTMLElement>("[data-drawer-close]")
            }
            className="border-foreground text-foreground h-full w-[min(20rem,calc(100vw-3.5rem))] [transform:translateX(var(--drawer-swipe-movement-x))] overflow-y-auto overscroll-contain rounded-r-2xl border-2 border-l-0 bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-[6px_0_0_var(--primary)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-ending-style:[transform:translateX(-100%)] data-starting-style:[transform:translateX(-100%)] motion-reduce:transition-none"
          >
            <Drawer.Title className="sr-only">Menu</Drawer.Title>
            {children}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
