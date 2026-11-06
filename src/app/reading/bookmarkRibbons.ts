import { t } from '../../i18n/t'
import { memStore } from '../tools/store'
import { addBookmark, getBookmarks, type Bookmark } from './readingMarks'
import type { ReadingPosition } from './useReadingPosition'

/**
 * Bookmarked paragraphs keep a small ribbon in the margin, in reading and
 * in editing (B2). It is plain CSS written for the ids of this page's
 * bookmarks, so the editor never has to know about it (it redraws its own
 * elements and would drop anything we add to them).
 */

const STYLE_ID = 'ln-bookmark-ribbons'

/** Bumped whenever a bookmark is added or removed, so panels redraw. */
export const bookmarksVersion = memStore(0)

/** The CSS for these block ids; `fresh` drops in with a short animation. */
export function ribbonCss(ids: readonly string[], fresh?: string): string {
  const safe = ids.filter((id) => /^[A-Za-z0-9_-]{1,64}$/.test(id))
  if (safe.length === 0) return ''
  const selector = (id: string) => `.bn-block-outer[data-id="${id}"]::before`
  const own = (id: string) => `.bn-block-outer[data-id="${id}"]`
  const base = `${safe.map(own).join(',\n')} {
  position: relative;
}
${safe.map(selector).join(',\n')} {
  content: '';
  position: absolute;
  inset-inline-start: -14px;
  top: 0;
  width: 10px;
  height: 20px;
  background: var(--color-accent, #2f6fed);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%);
  pointer-events: none;
}`
  const drop =
    fresh && safe.includes(fresh)
      ? `\n${selector(fresh)} { animation: ln-ribbon-drop 0.6s ease-out; }`
      : ''
  return base + drop
}

/** Writes the ribbons of one page into the document. */
export function syncBookmarkRibbons(pageId: string, fresh?: string): void {
  if (typeof document === 'undefined') return
  let el = document.getElementById(STYLE_ID)
  const css = ribbonCss(
    getBookmarks(pageId).map((b) => b.blockId),
    fresh,
  )
  if (!css) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    document.head.appendChild(el)
  }
  el.textContent = css
}

export function clearBookmarkRibbons(): void {
  document.getElementById(STYLE_ID)?.remove()
}

/** Adds a bookmark at the top of the screen; returns it (null if none). */
export function addBookmarkHere(
  pageId: string,
  position: ReadingPosition,
): Bookmark | null {
  const blockId = position.topBlockId()
  if (!blockId) return null
  const el = document.querySelector(
    `.bn-block-outer[data-id="${CSS.escape(blockId)}"]`,
  )
  const label =
    (el?.textContent ?? '').trim().slice(0, 60) || t('reading.bookmarkUntitled')
  const before = getBookmarks(pageId).length
  const list = addBookmark(pageId, {
    blockId,
    label,
    progress: position.progress,
  })
  if (list.length === before) return null
  bookmarksVersion.set(bookmarksVersion.get() + 1)
  syncBookmarkRibbons(pageId, blockId)
  return list.find((b) => b.blockId === blockId) ?? null
}
