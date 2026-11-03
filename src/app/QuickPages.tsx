import { useLiveQuery } from 'dexie-react-hooks'
import { Tip } from '../help/Help'
import { t } from '../i18n/t'
import type { LearningNotesDB } from '../core/db'
import { isLive } from '../core/records'
import type { Page } from '../core/types'
import { RECENT_SHOWN, pageTitle } from './pageTitle'
import { readRecentPages } from '../search/recentPages'
import { favourites, toggleFavourite } from './favourites'
import { Icon } from './tools/icons'
import { prefStore } from './tools/store'
import { isBoolean } from './uiPrefs'

const recentOpen = prefStore('sidebar.recentOpen', isBoolean, false)
const favouritesOpen = prefStore('sidebar.favouritesOpen', isBoolean, true)

/** The live pages for these ids, in the same order (gone ones left out). */
function useLivePages(db: LearningNotesDB, ids: readonly string[]) {
  const key = ids.join('|')
  return useLiveQuery(
    async () =>
      (await db.pages.bulkGet([...ids])).filter(
        (page): page is Page => !!page && isLive(page),
      ),
    [db, key],
  )
}

interface SectionProps {
  db: LearningNotesDB
  currentPageId: string | null
  onOpen: (pageId: string) => void
}

/** A foldable list of pages under a small heading. */
function PageList({
  heading,
  icon,
  open,
  onToggle,
  pages,
  currentPageId,
  onOpen,
  starred,
  tip,
}: {
  heading: string
  icon: 'star' | 'clock'
  open: boolean
  onToggle: () => void
  pages: Page[]
  currentPageId: string | null
  onOpen: (pageId: string) => void
  /** Favourites: each row has a button that takes the star off. */
  starred?: boolean
  tip: 'sidebar.favourites' | 'sidebar.recent'
}) {
  return (
    <div className="mb-1">
      <Tip id={tip} className="flex">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-hover"
        >
          <span aria-hidden className="text-muted">
            <Icon name={icon} size={15} />
          </span>
          <span className="flex-1">{heading}</span>
          <span aria-hidden className="text-[10px] text-muted">
            {open ? '▾' : '▸'}
          </span>
        </button>
      </Tip>
      {open && (
        <ul aria-label={heading} className="ms-4 grid">
          {pages.map((page) => (
            <li
              key={page.id}
              className="flex items-center rounded-md hover:bg-hover"
            >
              <button
                type="button"
                onClick={() => onOpen(page.id)}
                aria-current={page.id === currentPageId ? 'page' : undefined}
                className={`min-h-8 min-w-0 flex-1 truncate px-2 text-left text-sm ${
                  page.id === currentPageId ? 'font-semibold' : ''
                }`}
              >
                {pageTitle(page)}
              </button>
              {starred && (
                <button
                  type="button"
                  aria-label={t('fav.removeNamed', { name: pageTitle(page) })}
                  onClick={() => toggleFavourite(page.id)}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-muted hover:text-ink"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Starred pages, near the top of the sidebar (hidden while there are none). */
export function FavouritesSection({ db, currentPageId, onOpen }: SectionProps) {
  const ids = favourites.useValue()
  const open = favouritesOpen.useValue()
  const pages = useLivePages(db, ids)
  if (!pages || pages.length === 0) return null
  return (
    <PageList
      heading={t('sidebar.favourites')}
      icon="star"
      open={open}
      onToggle={() => favouritesOpen.set(!open)}
      pages={pages}
      currentPageId={currentPageId}
      onOpen={onOpen}
      starred
      tip="sidebar.favourites"
    />
  )
}

/**
 * The last few pages opened on this device (the list is kept in the
 * browser; only the few shown are read from the database, by id).
 */
export function RecentSection({ db, currentPageId, onOpen }: SectionProps) {
  const open = recentOpen.useValue()
  // The open page changes the list, so it is read again on every draw.
  const ids = readRecentPages().slice(0, RECENT_SHOWN + 4)
  const pages = useLivePages(db, ids)
  const shown = (pages ?? []).slice(0, RECENT_SHOWN)
  if (shown.length === 0) return null
  return (
    <PageList
      heading={t('sidebar.recent')}
      icon="clock"
      open={open}
      onToggle={() => recentOpen.set(!open)}
      pages={shown}
      currentPageId={currentPageId}
      onOpen={onOpen}
      tip="sidebar.recent"
    />
  )
}
