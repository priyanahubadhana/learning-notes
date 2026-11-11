import { useContext } from 'react'
import { t } from '../../i18n/t'
import { AppUiContext } from '../appUi'
import { Shell } from './ReadingPanels'
import {
  addBookmarkHere,
  bookmarksVersion,
  syncBookmarkRibbons,
} from './bookmarkRibbons'
import {
  addBookmark,
  getBookmarks,
  removeBookmark,
  type Bookmark,
} from './readingMarks'
import type { ReadingPosition } from './useReadingPosition'
import { Icon } from '../tools/icons'

/**
 * Bookmarks (B2): their own panel (separate from Contents). Each shows a
 * snippet, how far into the page it is and the date; tap to go there, 🗑 to
 * remove (with Undo). Adding one drops a ribbon into the margin.
 */

const secondary =
  'min-h-11 rounded-lg border border-line px-4 text-sm hover:bg-hover'

export function BookmarksPanel({
  pageId,
  position,
  onClose,
}: {
  pageId: string
  position: ReadingPosition
  onClose: () => void
}) {
  const { toast } = useContext(AppUiContext)
  const version = bookmarksVersion.useValue()
  void version
  const marks = getBookmarks(pageId)

  const changed = () => {
    bookmarksVersion.set(bookmarksVersion.get() + 1)
    syncBookmarkRibbons(pageId)
  }
  const add = () => {
    const mark = addBookmarkHere(pageId, position)
    if (!mark) return
  }
  const remove = (m: Bookmark) => {
    removeBookmark(pageId, m.id)
    changed()
    toast(t('reading.bookmarkRemoved'), {
      label: t('reading.undo'),
      onSelect: () => {
        addBookmark(pageId, {
          blockId: m.blockId,
          label: m.label,
          progress: m.progress,
        })
        changed()
      },
    })
  }
  const date = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  })

  return (
    <Shell name="bookmarks" title={t('reading.bookmarks')} onClose={onClose}>
      <button type="button" onClick={add} className={`${secondary} mb-2`}>
        {t('reading.bookmarkAdd')}
      </button>
      {marks.length === 0 ? (
        <p className="text-sm text-muted">{t('reading.bookmarksNone')}</p>
      ) : (
        <ul>
          {marks.map((m) => (
            <li key={m.id} className="flex items-center">
              <button
                type="button"
                data-bookmark={m.blockId}
                onClick={() => {
                  position.goToBlock(m.blockId)
                  onClose()
                }}
                className="min-h-11 flex-1 rounded-lg px-2 text-start text-sm hover:bg-hover"
              >
                <span className="line-clamp-2">{m.label}</span>
                <span className="block text-xs text-muted">
                  {Math.round(m.progress * 100)}% · {date.format(m.at)}
                </span>
              </button>
              <button
                type="button"
                aria-label={t('reading.bookmarkRemove', { name: m.label })}
                onClick={() => remove(m)}
                className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted hover:bg-hover"
              >
                <Icon name="trash" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}
