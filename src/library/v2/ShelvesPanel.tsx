import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import type { LearningNotesDB } from '../../core/db'
import { useLevel } from '../../settings/level'
import { MenuPopover, type MenuItem } from '../../app/ui'
import { t } from '../../i18n/t'
import { listSources } from '../libraryService'
import { setPrefs, useLibraryPrefs, type ShelfId } from './libraryPrefs'
import { recentSources, shelfCounts } from './shelves'
import { SHELF_IDS, shelfName } from './shelfNames'
import { useTagItems } from './tagItems'

/**
 * The side panel of the Library (LB-B14..B17): Shelves with counts, your
 * collections and Recent. Professional adds Tags and Saved filters.
 */
export function ShelvesPanel({
  db,
  workspaceId,
  currentPageId,
  onOpenPage,
  onSelectShelf,
}: {
  db: LearningNotesDB
  workspaceId: string
  currentPageId: string | null
  onOpenPage: (pageId: string) => void
  onSelectShelf?: () => void
}) {
  const prefs = useLibraryPrefs()
  const pro = useLevel() === 'professional'
  const sources = useLiveQuery(
    () => listSources(db, workspaceId),
    [db, workspaceId],
  )
  const { items: tagItems } = useTagItems(db, sources ?? [])
  const counts = shelfCounts(sources ?? [], prefs)
  const recent = recentSources(sources ?? [], prefs.recentAll ? 1000 : 5)
  const pick = (shelf: ShelfId) => {
    setPrefs({ shelf })
    onSelectShelf?.()
  }
  const row = (shelf: ShelfId, label: string, n: number) => (
    <li key={shelf}>
      <button
        type="button"
        data-testid={`shelf-${shelf}`}
        aria-current={prefs.shelf === shelf ? 'page' : undefined}
        onClick={() => pick(shelf)}
        className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-start text-sm hover:bg-hover ${prefs.shelf === shelf ? 'bg-hover font-medium' : ''}`}
      >
        <span className="truncate">{label}</span>
        <span className="text-xs text-muted">{n}</span>
      </button>
    </li>
  )
  return (
    <section
      aria-label={t('lib2.shelves')}
      className="px-1.5 py-2"
      data-testid="library-panel"
    >
      <h2 className="mb-1 px-1 text-[11px] tracking-[0.06em] text-muted uppercase">
        {t('lib2.shelves')}
      </h2>
      <ul>{SHELF_IDS.map((s) => row(s, t(`lib2.shelf.${s}`), counts[s]))}</ul>
      <h3 className="mt-3 mb-1 px-1 text-[11px] tracking-[0.06em] text-muted uppercase">
        {t('lib2.collections')}
      </h3>
      {prefs.collections.length === 0 ? (
        <p className="px-3 text-xs text-muted">{t('lib2.noCollections')}</p>
      ) : (
        <ul>
          {prefs.collections.map((c) =>
            row(`c:${c.id}`, c.name, counts.collections[c.id] ?? 0),
          )}
        </ul>
      )}
      {pro && (
        <>
          <h3 className="mt-3 mb-1 px-1 text-[11px] tracking-[0.06em] text-muted uppercase">
            {t('lib2.tags')}
          </h3>
          {tagItems.length === 0 && (
            <p data-testid="panel-tags" className="px-3 text-xs text-muted">
              {t('lib2.noTags')}
            </p>
          )}
          <ul data-testid="panel-tags-list">
            {[...tagItems]
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
              .map((x) => (
                <li key={x.id}>
                  <button
                    type="button"
                    aria-pressed={prefs.tagIds.includes(x.id)}
                    onClick={() => {
                      setPrefs({ tagIds: [x.id], shelf: 'all' })
                      onSelectShelf?.()
                    }}
                    className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-start text-sm hover:bg-hover"
                  >
                    <span className="truncate">#{x.name}</span>
                    <span className="text-xs text-muted">{x.count}</span>
                  </button>
                </li>
              ))}
          </ul>
        </>
      )}
      <h3 className="mt-3 mb-1 px-1 text-[11px] tracking-[0.06em] text-muted uppercase">
        {prefs.recentAll ? t('lib2.everything') : t('lib2.recent')}
      </h3>
      {recent.length === 0 ? (
        <p className="px-3 text-xs text-muted">{t('library.empty')}</p>
      ) : (
        <ul data-testid="panel-recent">
          {recent.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpenPage(p.id)}
                aria-current={p.id === currentPageId ? 'page' : undefined}
                className={`min-h-11 w-full truncate rounded-lg px-3 text-start text-sm hover:bg-hover ${p.id === currentPageId ? 'bg-hover font-medium' : ''}`}
              >
                {p.title || t('review.untitled')}
              </button>
            </li>
          ))}
        </ul>
      )}
      {(sources?.length ?? 0) > 5 && (
        <button
          type="button"
          data-testid="recent-toggle"
          onClick={() => setPrefs({ recentAll: !prefs.recentAll })}
          className="min-h-11 px-3 text-xs text-accent"
        >
          {prefs.recentAll ? t('lib2.showLess') : t('lib2.showAll')}
        </button>
      )}
    </section>
  )
}

/** The shelf button by the title (phone, or a closed side panel). */
export function ShelfButton({
  db,
  workspaceId,
}: {
  db: LearningNotesDB
  workspaceId: string
}) {
  const prefs = useLibraryPrefs()
  const [at, setAt] = useState<DOMRect | null>(null)
  const sources = useLiveQuery(
    () => listSources(db, workspaceId),
    [db, workspaceId],
  )
  const counts = shelfCounts(sources ?? [], prefs)
  const items: MenuItem[] = [
    ...SHELF_IDS.map((s) => ({
      label: `${t(`lib2.shelf.${s}`)} · ${counts[s]}`,
      icon: 'bookOpen',
      checked: prefs.shelf === s,
      onSelect: () => setPrefs({ shelf: s }),
    })),
    ...prefs.collections.map((c) => ({
      label: `${c.name} · ${counts.collections[c.id] ?? 0}`,
      icon: 'notebook',
      checked: prefs.shelf === `c:${c.id}`,
      onSelect: () => setPrefs({ shelf: `c:${c.id}` as ShelfId }),
    })),
  ]
  return (
    <>
      <button
        type="button"
        data-testid="shelf-button"
        aria-haspopup="menu"
        onClick={(e) => setAt(e.currentTarget.getBoundingClientRect())}
        className="min-h-11 max-w-[46vw] truncate rounded-full bg-soft px-4 text-sm font-semibold"
      >
        {shelfName(prefs)} ▾
      </button>
      {at && (
        <MenuPopover anchor={at} onClose={() => setAt(null)} items={items} />
      )}
    </>
  )
}
