import { useSyncExternalStore } from 'react'
import type { Page } from '../core/types'

/**
 * Polish 2 item 9: the open page's sheets, shared with the left panel's
 * Pages tab (thumbnails). The paper reports what it shows; the panel reads.
 * Nothing is stored.
 */
export type SheetInfo = {
  pageId: string
  count: number
  sheet: 'A4' | 'Letter'
  bg: Page['inkBg']
}

let current: SheetInfo | null = null
const listeners = new Set<() => void>()

export const sheetNav = {
  get: () => current,
  set(next: SheetInfo | null) {
    const a = current
    if (
      a === next ||
      (a &&
        next &&
        a.pageId === next.pageId &&
        a.count === next.count &&
        a.sheet === next.sheet &&
        a.bg === next.bg)
    )
      return
    current = next
    for (const fn of listeners) fn()
  },
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

export const useSheetInfo = () =>
  useSyncExternalStore(sheetNav.subscribe, sheetNav.get)

/** Scrolls the open page to its n-th sheet (1-based). */
export function jumpToSheet(n: number) {
  document
    .querySelector('[data-paper-sheet="' + Math.floor(n) + '"]')
    ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}
