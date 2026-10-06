/**
 * Decisions about pointers on the draw screen, kept apart from the canvas so
 * they can be tested without a browser.
 */

/** The parts of a pointer event these decisions read. */
type PointerLike = {
  pointerType: string;
  isPrimary: boolean;
};

/**
 * What a pointer going down on the canvas is, given whether a stylus is
 * already drawing.
 *
 * - `ignore`: a touch while a stylus is on the canvas. That's the hand holding
 *   the stylus resting on the screen, not a second finger: counting it would
 *   throw the stroke away and start zooming with the palm (issue #158).
 * - `stylus`: a stylus touching down. Anything a palm that landed first had
 *   started is dropped, and it draws on its own.
 * - `fresh`: the first finger of a new touch. No other finger is down, so any
 *   finger still remembered is one whose lift the browser never reported, and
 *   it's forgotten rather than left to pair with this one as a pinch.
 * - `add`: any other pointer, which joins the ones already down.
 */
export function pointerRole(
  event: PointerLike,
  stylusDown: boolean,
): "ignore" | "stylus" | "fresh" | "add" {
  if (event.pointerType === "pen") return "stylus";
  if (event.pointerType === "touch") {
    if (stylusDown) return "ignore";
    if (event.isPrimary) return "fresh";
  }
  return "add";
}

/**
 * Whether a finger or stylus lifting off a button counts as pressing it.
 *
 * A browser only turns a tap into a click when it's the only finger on the
 * screen, so a tap made while a thumb still rests on the drawing (which is
 * how a pinch often ends) never clicks (issue #156). A finger or stylus is
 * held by the button it went down on, so its lift is always reported there;
 * it counts if it lifted over the button. A mouse waits for its click, which
 * the keyboard also sends.
 */
export function pressedByLift(
  event: PointerLike & { clientX: number; clientY: number },
  box: { left: number; top: number; right: number; bottom: number },
): boolean {
  if (event.pointerType !== "touch" && event.pointerType !== "pen") {
    return false;
  }
  return (
    event.clientX >= box.left &&
    event.clientX <= box.right &&
    event.clientY >= box.top &&
    event.clientY <= box.bottom
  );
}
