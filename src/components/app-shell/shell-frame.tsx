"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Toast } from "@base-ui/react/toast";
import { ListIcon } from "@phosphor-icons/react";
import { type Chrome, chromeForPath } from "./chrome";
import { ShellToasts } from "./shell-toasts";

type ShellState = {
  chrome: Chrome;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
};

const ShellContext = createContext<ShellState | null>(null);

/** The shell's state, for the sidebar and the menu buttons. */
export function useShell(): ShellState {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error("useShell must be used inside the AppShell");
  return shell;
}

/**
 * The layout every page sits in: the sidebar column beside the page on a
 * laptop (`lg` and up), and nothing beside it below that, where the menu
 * button opens the drawer. The draw step keeps the drawer but loses the
 * column; the print view gets neither.
 *
 * `sidebar` is rendered once, in the column's slot, whatever the width: it
 * holds the drawer too, whose popup is portalled to the body, so it still
 * opens while the column itself is hidden.
 */
export function ShellFrame({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const chrome = chromeForPath(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Close the drawer on any navigation, including back and forward.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setDrawerOpen(false);
  }

  const shell = useMemo(
    () => ({ chrome, drawerOpen, setDrawerOpen }),
    [chrome, drawerOpen],
  );

  if (chrome === "none") return <>{children}</>;

  return (
    <ShellContext.Provider value={shell}>
      <Toast.Provider timeout={5000} limit={3}>
        <div className="flex flex-1">
          <aside
            className={
              chrome === "full"
                ? "sticky top-0 hidden h-dvh w-80 shrink-0 py-6 pl-6 lg:block"
                : "hidden"
            }
          >
            {sidebar}
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
        <ShellToasts />
      </Toast.Provider>
    </ShellContext.Provider>
  );
}

/**
 * The slim white row a page without the blue header starts with on a phone
 * (the marketing page, `CardPage` pages, the legal pages): `[≡] DrawPin`.
 * Gone on a laptop, where the sidebar column is the way around.
 */
export function ShellTopBar() {
  const shell = useContext(ShellContext);
  if (!shell || shell.chrome !== "full") return null;
  return (
    <div className="flex items-center gap-2 px-3 pt-3 md:px-6 md:pt-6 lg:hidden">
      <MenuButton tone="white" />
      <Link
        href="/"
        className="focus-visible:ring-highlight rounded-lg px-1 text-lg font-black tracking-tighter outline-none focus-visible:ring-3"
      >
        Draw<span className="text-primary">Pin</span>
      </Link>
    </div>
  );
}

/**
 * Opens the sidebar drawer. On a page with the blue header it sits in the
 * header's first row (`tone="blue"`), hidden on a laptop where the column is
 * always there; on a page without one it's white and outlined, and on the
 * draw step it shows at every width, since the draw step has no column.
 */
export function MenuButton({ tone = "blue" }: { tone?: "blue" | "white" }) {
  const shell = useContext(ShellContext);
  // Outside the shell (the print view) there's no drawer to open.
  if (!shell) return null;

  const hideOnLaptop = shell.chrome === "full" ? "lg:hidden" : "";
  return (
    <button
      type="button"
      onClick={() => shell.setDrawerOpen(true)}
      aria-label="Open menu"
      aria-expanded={shell.drawerOpen}
      className={
        tone === "blue"
          ? `focus-visible:ring-highlight inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/35 transition-colors duration-150 ease-out outline-none hover:bg-white/25 focus-visible:ring-3 motion-reduce:transition-none ${hideOnLaptop}`
          : `border-foreground hover:bg-secondary focus-visible:ring-highlight inline-flex size-11 shrink-0 items-center justify-center rounded-xl border-2 bg-white transition-colors duration-150 ease-out outline-none focus-visible:ring-3 motion-reduce:transition-none ${hideOnLaptop}`
      }
    >
      <ListIcon weight="bold" className="size-6" />
    </button>
  );
}
