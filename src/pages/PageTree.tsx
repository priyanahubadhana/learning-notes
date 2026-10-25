import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import { runTask } from '../app/errors'
import { IconButton, RenameInput } from '../app/ui'
import type { TreeState } from '../app/useTreeState'
import type { LearningNotesDB } from '../core/db'
import { descendantIds } from '../core/records'
import type { Page } from '../core/types'
import { listPages, renamePage } from './pageService'

interface PageTreeProps {
  db: LearningNotesDB
  notebookId: string
  currentPageId: string | null
  tree: TreeState
  onOpen: (pageId: string) => void
  onAddSubPage: (parentId: string) => void
  /** `affectsCurrent`: the open page is this page or inside it. */
  onRequestDelete: (page: Page, affectsCurrent: boolean) => void
}

/** The nested pages of one notebook in the sidebar. Updates live. */
export function PageTree({
  db,
  notebookId,
  currentPageId,
  tree,
  onOpen,
  onAddSubPage,
  onRequestDelete,
}: PageTreeProps) {
  const pages = useLiveQuery(() => listPages(db, notebookId), [db, notebookId])
  const [renamingId, setRenamingId] = useState<string | null>(null)
  if (!pages) return null

  const childrenOf = new Map<string | null, Page[]>()
  for (const page of pages) {
    const list = childrenOf.get(page.parentId) ?? []
    list.push(page)
    childrenOf.set(page.parentId, list)
  }

  const renderLevel = (parentId: string | null, depth: number): ReactNode =>
    (childrenOf.get(parentId) ?? []).map((page) => {
      const hasChildren = childrenOf.has(page.id)
      const open = tree.isPageOpen(page.id)
      const active = page.id === currentPageId
      const affectsCurrent =
        currentPageId !== null &&
        (active || descendantIds(pages, page.id).includes(currentPageId))

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
              aria-label={open ? 'Collapse' : 'Expand'}
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
                {page.title || 'Untitled'}
              </button>
            )}
            <span className="flex opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
              <IconButton
                title="Add sub-page"
                onClick={() => onAddSubPage(page.id)}
              >
                +
              </IconButton>
              <IconButton
                title="Delete page"
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

  return <>{renderLevel(null, 1)}</>
}
