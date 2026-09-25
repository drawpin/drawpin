/** A key press reduced to what the history shortcuts read. */
type ShortcutKey = Pick<
  KeyboardEvent,
  "key" | "ctrlKey" | "metaKey" | "shiftKey"
>;

/**
 * Which drawing-history action a key press asks for, or `null`.
 *
 * Ctrl on Windows and Linux, Cmd on a Mac. Ctrl/Cmd+Z undoes; both
 * Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo — the two conventions people already
 * have in their fingers from other apps.
 */
export function historyShortcut(event: ShortcutKey): "undo" | "redo" | null {
  if (!event.ctrlKey && !event.metaKey) return null;

  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (key === "y") return "redo";
  return null;
}

/** Input types whose key presses are text being typed. */
const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "email",
  "url",
  "tel",
  "password",
  "number",
]);

/**
 * Whether a key press belongs to a field someone is typing in, where Ctrl+Z
 * should undo their typing rather than their last stroke.
 *
 * Only text-entry controls count. The brush-size slider is an `<input>` too,
 * and it takes focus when opened, but nothing is typed into it — so Ctrl+Z
 * there still undoes the drawing.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  return (
    target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type)
  );
}
