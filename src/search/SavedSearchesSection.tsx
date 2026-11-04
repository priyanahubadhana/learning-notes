import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { runTask } from '../app/errors'
import { ConfirmDialog, IconButton, NameDialog } from '../app/ui'
import { SidebarGroup } from '../app/SidebarGroup'
import type { LearningNotesDB } from '../core/db'
import type { SavedSearch } from '../core/types'
import { t } from '../i18n/t'
import { useMinuteClock } from '../recall/useMinuteClock'
import {
  deleteSavedSearch,
  listSavedSearches,
  readSavedQuery,
  renameSavedSearch,
} from './savedSearchService'
import { runSearch } from './searchQuery'

interface Counts {
  results: number
  cards: number
}

/**
 * "Saved searches" in the sidebar (shown once there is one). Each opens the
 * Search screen; one with cards is a deck, with ⟳ to review it.
 *
 * Counts are worked out when the list changes and once a minute, not on
 * every keystroke in a note: a saved search over many cards takes a
 * moment, and the sidebar must never slow down typing.
 */
export function SavedSearchesSection({
  db,
  activeId,
  onOpen,
  onReview,
}: {
  db: LearningNotesDB
  /** The saved search open in the Search screen, if any. */
  activeId: string | null
  onOpen: (saved: SavedSearch) => void
  onReview: (saved: SavedSearch) => void
}) {
  const saved = useLiveQuery(() => listSavedSearches(db), [db])
  const now = useMinuteClock()
  const [counts, setCounts] = useState(new Map<string, Counts>())
  const [renaming, setRenaming] = useState<SavedSearch | null>(null)
  const [deleting, setDeleting] = useState<SavedSearch | null>(null)

  const key = JSON.stringify(saved?.map((s) => [s.id, s.query]) ?? [])
  useEffect(() => {
    let cancelled = false
    const list = JSON.parse(key) as [string, SavedSearch['query']][]
    Promise.all(
      list.map(async ([id, query]) => {
        const { hits } = await runSearch(db, readSavedQuery(query), now)
        const cards = hits.filter((h) => h.type === 'card').length
        return [id, { results: hits.length, cards }] as const
      }),
    ).then(
      (entries) => {
        if (!cancelled) setCounts(new Map(entries))
      },
      (error: unknown) =>
        console.error('Could not count saved searches', error),
    )
    return () => {
      cancelled = true
    }
  }, [db, key, now])

  return (
    <SidebarGroup
      id="saved"
      title={t('saved.title')}
      defaultOpen={false}
      openSignal={saved?.length}
      hidden={!saved || saved.length === 0}
    >
      {(saved ?? []).map((s) => {
        const count = counts.get(s.id)
        return (
          <div
            key={s.id}
            className={`group flex min-h-8 items-center gap-1.5 rounded-md py-0.5 pr-1 pl-2.5 text-sm ${
              s.id === activeId ? 'bg-hover font-medium' : 'hover:bg-hover'
            }`}
          >
            <span aria-hidden className="w-4 text-center text-xs text-muted">
              ☆
            </span>
            <button
              type="button"
              onClick={() => onOpen(s)}
              aria-current={s.id === activeId ? 'page' : undefined}
              className="min-w-0 flex-1 truncate text-left"
            >
              {s.name || t('saved.untitled')}
            </button>
            <span className="flex opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
              <IconButton
                title={t('saved.rename')}
                tip="sidebar.savedRename"
                onClick={() => setRenaming(s)}
              >
                ✎
              </IconButton>
              <IconButton
                title={t('saved.delete')}
                tip="sidebar.savedDelete"
                onClick={() => setDeleting(s)}
              >
                ×
              </IconButton>
            </span>
            {count && count.cards > 0 && (
              <IconButton
                title={t('saved.review', { count: count.cards })}
                tip="sidebar.savedReview"
                onClick={() => onReview(s)}
              >
                ⟳
              </IconButton>
            )}
            {count && (
              <span className="min-w-5 text-end text-[11.5px] text-muted tabular-nums">
                {count.results}
              </span>
            )}
          </div>
        )
      })}

      {renaming && (
        <NameDialog
          title={t('saved.rename')}
          label={t('saved.name')}
          initialValue={renaming.name}
          confirmLabel={t('saved.renameConfirm')}
          onConfirm={(name) => {
            if (name) runTask(renameSavedSearch(db, renaming.id, name))
            setRenaming(null)
          }}
          onCancel={() => setRenaming(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message={t('saved.deleteMessage', { name: deleting.name })}
          confirmLabel={t('saved.deleteConfirm')}
          onConfirm={() => {
            runTask(deleteSavedSearch(db, deleting.id))
            setDeleting(null)
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </SidebarGroup>
  )
}
