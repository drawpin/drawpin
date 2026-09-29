import { useSyncExternalStore } from "react";

/**
 * Whether the draw screen holds a drawing that hasn't been posted.
 *
 * The drawing lives in the form, but the back button sits in the page's
 * header, outside it; this is the one fact the two share, so the back button
 * can warn before throwing a drawing away.
 */
let unsaved = false;
const listeners = new Set<() => void>();

/** For event handlers, which read it at the moment rather than on render. */
export function hasUnsavedDrawing(): boolean {
  return unsaved;
}

export function setUnsavedDrawing(next: boolean): void {
  if (unsaved === next) return;
  unsaved = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `false` on the server, where nothing has been drawn yet. */
export function useUnsavedDrawing(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => unsaved,
    () => false,
  );
}
