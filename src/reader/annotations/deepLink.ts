import { routeToHash } from '../../app/router'
import type { Annotation } from '../../core/types'
import { locatorOf } from './annotationService'

/**
 * Deep links (C4): every highlight and note links to its exact spot,
 * `#/read/<pageId>?at=<locator>`. Links written into notes are full addresses
 * of the app (a note link must be a web address), so a click is caught here
 * and shown inside the app, with no new browser tab.
 */

/** The full address that opens the reader at an annotation, or a note page. */
export function deepLinkFor(
  a: Pick<Annotation, 'pageId' | 'anchor'>,
  base: string = appBase(),
): string | null {
  if (a.anchor.type === 'block') {
    return base + routeToHash({ kind: 'page', id: a.pageId })
  }
  const at = locatorOf(a.anchor)
  if (!at) return null
  return base + routeToHash({ kind: 'read', pageId: a.pageId, at })
}

/** The app address without any hash. */
const appBase = (): string =>
  typeof location === 'undefined'
    ? ''
    : `${location.origin}${location.pathname}`

/** The hash inside one of this app's own addresses, or null for other links. */
export function ownHash(href: string, base: string = appBase()): string | null {
  if (!href.startsWith(`${base}#/`)) return null
  return href.slice(base.length)
}

/** Catches clicks on the app's own addresses and navigates without a new tab. */
export function installDeepLinks(): () => void {
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0) return
    if (e.metaKey || e.ctrlKey || e.shiftKey) return
    const a = (e.target as Element | null)?.closest?.('a[href]')
    const hash = a ? ownHash((a as HTMLAnchorElement).href) : null
    if (!hash) return
    e.preventDefault()
    location.hash = hash
  }
  document.addEventListener('click', onClick, true)
  return () => document.removeEventListener('click', onClick, true)
}
