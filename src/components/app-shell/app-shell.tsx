import { type ReactNode, Suspense } from "react";
import { loadSidebarData } from "./load-sidebar";
import { ShellFrame } from "./shell-frame";
import { Sidebar } from "./sidebar";

/** Loads the sidebar's data on the server, streamed in after the page. */
async function SidebarLoader() {
  return <Sidebar data={await loadSidebarData()} />;
}

/** While the sidebar loads: the brand, and three grey rows (no shimmer). */
function SidebarSkeleton() {
  return (
    <div
      aria-hidden
      className="border-foreground flex h-full flex-col gap-5 rounded-2xl border-2 bg-white p-3 pl-5 shadow-[6px_6px_0_var(--primary)]"
    >
      <span className="text-2xl font-black tracking-tighter">
        Draw<span className="text-primary">Pin</span>
      </span>
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <span className="bg-muted size-10 rounded-md" />
            <span className="bg-muted h-4 flex-1 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The app shell every page sits in (ADR-015; docs/design/profiles.md,
 * section 2): the sidebar beside the page on a laptop, a drawer from the
 * menu button on a phone. Wired once, in the root layout.
 *
 * How much of it a page gets (`full`, `button-only` on the draw step, `none`
 * on the print view) follows the path on the client (`chromeForPath`), since
 * this layout stays mounted as people move between pages.
 *
 * The sidebar's data streams in under `Suspense`, so it never holds up the
 * page.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ShellFrame
      sidebar={
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarLoader />
        </Suspense>
      }
    >
      {children}
    </ShellFrame>
  );
}
