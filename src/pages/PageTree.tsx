import { displayName, sampleName } from '../i18n/defaultNames'
import { t } from '../i18n/t'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import { runTask } from '../app/errors'
import { favourites, toggleFavourite } from '../app/favourites'
import { IconButton, RenameInput } from '../app/ui'
import type { TreeState } from '../app/useTreeState'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { monthLabel, shortDayLabel } from '../journal/dates'
import { listNotePages, movePageToTopLevel, renamePage } from './pageService'

interface PageTreeProps {
  db: LearningNotesDB
  notebookId: string
  currentPageId: string | null
  tree: TreeState
  /** Journal notebook: newest first, short date labels, no add/move. */
  journal?: boolean
  /** Show only the sub-pages of this page (e.g. a template's), no moving. */
  rootId?: string
  onOpen: (pageId: string) => void
  /** `anchor`: the + button's position, for the Blank/Template menu. */
  onAddSubPage?: (parentId: string, anchor: DOMRect) => void
  /** `affectsCurrent`: the open page is this page or inside it. */
  onRequestDelete: (page: Page, affectsCurrent: boolean) => void
}

/** The nested pages of one notebook in the sidebar. Updates live. */
export function PageTree({
  db,
  notebookId,
  currentPageId,
  tree,
  journal = false,
  rootId,
  onOpen,
  onAddSubPage,
  onRequestDelete,
}: PageTreeProps) {
  const pages = useLiveQuery(
    () => listNotePages(db, notebookId),
    [db, notebookId],
  )
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const starred = favourites.useValue()
  if (!pages) return null

  // The open page and the pages above it, worked out once per draw.
  const openPath = new Set<string>()
  const parentOf = new Map(pages.map((p) => [p.id, p.parentId]))
  for (let id = currentPageId; id && !openPath.has(id);) {
    openPath.add(id)
    id = parentOf.get(id) ?? null
  }

  const childrenOf = new Map<string | null, Page[]>()
  for (const page of pages) {
    const list = childrenOf.get(page.parentId) ?? []
    list.push(page)
    childrenOf.set(page.parentId, list)
  }
  if (journal) {
    // Newest month and day first ("YYYY-MM(-DD)" keys sort as text).
    const key = (p: Page) => p.journalDate ?? p.journalMonth ?? ''
    for (const list of childrenOf.values()) {
      list.sort((a, b) => (key(a) < key(b) ? 1 : key(a) > key(b) ? -1 : 0))
    }
  }

  const renderLevel = (parentId: string | null, depth: number): ReactNode =>
    (childrenOf.get(parentId) ?? []).map((page) => {
      const hasChildren = childrenOf.has(page.id)
      const open = tree.isPageOpen(page.id)
      const active = page.id === currentPageId
      const affectsCurrent = openPath.has(page.id)

      return (
        <div key={page.id}>
          <div
            className={`group flex items-center gap-1.5 rounded-md py-1 pr-2 text-sm ${
              active ? 'bg-hover font-medium' : 'hover:bg-hover'
            }`}
            style={{ paddingLeft: 8 + depth * 14 }}
          >
            <button
              type="button"
              onClick={() => hasChildren && tree.togglePage(page.id)}
              aria-label={t(open ? 'tree.collapse' : 'tree.expand')}
              className="w-3.5 text-center text-[10px] text-muted"
            >
              {hasChildren ? (open ? '▾' : '▸') : '·'}
            </button>
            {renamingId === page.id ? (
              <RenameInput
                initial={page.title}
                onDone={(title) => {
                  setRenamingId(null)
                  if (title) runTask(renamePage(db, page.id, title))
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => onOpen(page.id)}
                onDoubleClick={() => setRenamingId(page.id)}
                className="flex-1 truncate text-left"
              >
                {page.journalDate && !page.customTitle
                  ? shortDayLabel(page.journalDate)
                  : page.journalMonth && !page.customTitle
                    ? monthLabel(page.journalMonth)
                    : (rootId ? displayName(page.title) : sampleName(page)) ||
                      t('review.untitled')}
              </button>
            )}
            <span className="flex opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
              {!journal && !rootId && page.parentId !== null && (
                <IconButton
                  title={t('tree.moveTop')}
                  tip="sidebar.moveTop"
                  onClick={() => runTask(movePageToTopLevel(db, page.id))}
                >
                  ↰
                </IconButton>
              )}
              {!journal && onAddSubPage && (
                <IconButton
                  title={t('tree.addSub')}
                  tip="sidebar.addSubPage"
                  onClick={(e) =>
                    onAddSubPage(
                      page.id,
                      e.currentTarget.getBoundingClientRect(),
                    )
                  }
                >
                  +
                </IconButton>
              )}
              {!rootId && (
                <IconButton
                  aria-label={t(
                    starred.includes(page.id) ? 'fav.remove' : 'fav.add',
                  )}
                  aria-pressed={starred.includes(page.id)}
                  onClick={() => toggleFavourite(page.id)}
                >
                  {starred.includes(page.id) ? '★' : '☆'}
                </IconButton>
              )}
              <IconButton
                title={t('tree.deletePage')}
                tip="sidebar.deletePage"
                onClick={() => onRequestDelete(page, affectsCurrent)}
              >
                ×
              </IconButton>
            </span>
          </div>
          {hasChildren && open && renderLevel(page.id, depth + 1)}
        </div>
      )
    })

  return <>{rootId ? renderLevel(rootId, 2) : renderLevel(null, 1)}</>
}
