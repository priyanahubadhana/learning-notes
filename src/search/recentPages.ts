import { isStringArray, readPref, writePref } from '../app/uiPrefs'

/**
 * Pages opened recently on this device, newest first (shown in the search
 * popup before typing). A per-device convenience, like the open page.
 */

const KEY = 'recentPages'
/** How many are remembered (more than shown, so deleted ones can drop out). */
const KEEP = 20

export function readRecentPages(): string[] {
  return readPref(KEY, isStringArray, [])
}

export function rememberPage(pageId: string): void {
  const list = readRecentPages().filter((id) => id !== pageId)
  writePref(KEY, [pageId, ...list].slice(0, KEEP))
}
