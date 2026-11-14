/**
 * Where a press belongs (P1.5, first look L11).
 *
 * Some parts are drawn outside the box they belong to: the shared scroll bar
 * sits on the page body (so no rounded corner or moving panel clips it), next
 * to the list it scrolls. "Was this press inside my menu?" is asked with
 * `contains` / `closest`, and for such a part the answer was "no": pressing a
 * menu's own scroll bar closed the menu, and the rest of the press landed on
 * the page behind. A part names its home here; every "inside or outside?"
 * rule asks `pressHome(target)` instead of the raw target.
 *
 * Why it happened: the bar moved to the page body (fix-scroll, 14 Nov) and the
 * outside-tap rules were never told. No top-level side effects.
 */
const homes = new WeakMap<Element, Element>()

/** `part` (and everything in it) belongs to `home`. Returns the undo. */
export function setPressHome(part: Element, home: Element): () => void {
  homes.set(part, home)
  return () => {
    if (homes.get(part) === home) homes.delete(part)
  }
}

/** The element a press on `target` counts for: its part's home, or itself. */
export function pressHome(target: Element): Element {
  for (let el: Element | null = target; el; el = el.parentElement) {
    const home = homes.get(el)
    if (home) return home
  }
  return target
}
