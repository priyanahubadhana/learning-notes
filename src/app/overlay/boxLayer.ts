/**
 * The layer just above the box an element lives in (P1.5, first look L11).
 *
 * A part drawn on the page body for a list inside a floating box (the shared
 * scroll bar of the pages panel opened over the page) must sit above that box,
 * or the box hides it: the pages panel showed no scroll bar at all, and a
 * card's bar sat under the card. ScrollBar.css takes the higher of this and
 * its named layer (card, sheet, tray).
 *
 * Returns the outermost layer set around `el`, plus one; undefined when the
 * box does not float above the bars (the part keeps its own layer, --z-bar).
 */
export function layerAbove(el: HTMLElement): number | undefined {
  const view = el.ownerDocument.defaultView
  if (!view) return undefined
  let z: number | undefined
  for (
    let a: HTMLElement | null = el;
    a && a !== el.ownerDocument.body;
    a = a.parentElement
  ) {
    const v = parseInt(view.getComputedStyle(a).zIndex, 10)
    if (!Number.isNaN(v)) z = v
  }
  if (z === undefined) return undefined
  const bars = parseInt(
    view
      .getComputedStyle(el.ownerDocument.documentElement)
      .getPropertyValue('--z-bar'),
    10,
  )
  return z >= (Number.isNaN(bars) ? 0 : bars) ? z + 1 : undefined
}
