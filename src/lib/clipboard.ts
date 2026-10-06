/** The one part of the Clipboard API copying needs, so tests can stand in. */
type TextClipboard = Pick<Clipboard, "writeText">;

/**
 * Puts text on the clipboard, and says whether that worked.
 *
 * It can fail in ordinary ways: the API is missing on a page that isn't
 * served over HTTPS and in some in-app browsers, and the browser can refuse
 * the write. The caller then lets the person copy the text by hand.
 *
 * @param clipboard - Defaults to the browser's; absent outside a browser.
 */
export async function copyText(
  text: string,
  clipboard: TextClipboard | undefined = globalThis.navigator?.clipboard,
): Promise<boolean> {
  if (!clipboard?.writeText) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
