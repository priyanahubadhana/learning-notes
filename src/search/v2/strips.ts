import type { StripItem } from '../../design/parts/ContextStrip'
import { routeToHash } from '../../app/router'
import { ts } from './ts'

/**
 * SR-B10: the strip on a result row: Open, Copy link, Pin as favourite.
 * ("Open in new place" waits for the side-panel slice.) It never runs the
 * search again.
 */
export function resultStripItems(input: {
  pinned: boolean
  /** Pages only: a note or card result opens its page the same way. */
  canPin: boolean
}): StripItem[] {
  const items: StripItem[] = [
    { id: 'open', icon: 'arrowUpRight', label: ts('srv2.act.open') },
    { id: 'copyLink', icon: 'link', label: ts('srv2.act.copyLink') },
  ]
  if (input.canPin)
    items.push({
      id: 'pin',
      icon: input.pinned ? 'pinOff' : 'pin',
      label: ts(input.pinned ? 'srv2.act.unpin' : 'srv2.act.pin'),
    })
  return items
}

/** The address of a page (the same one the app puts in the address bar). */
export function pageLink(
  pageId: string,
  loc: Pick<Location, 'origin' | 'pathname'> = window.location,
): string {
  return `${loc.origin}${loc.pathname}${routeToHash({ kind: 'page', id: pageId })}`
}
