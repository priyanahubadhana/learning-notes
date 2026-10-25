import { useState, type DragEvent } from 'react'
import { runTask } from '../app/errors'
import { THEMES, THEME_LABELS, type Theme } from '../app/theme'
import { ConfirmDialog, IconButton, RenameInput } from '../app/ui'
import type { TreeState } from '../app/useTreeState'
import type { LearningNotesDB } from '../core/db'
import type { Notebook, Page } from '../core/types'
import { PageTree } from '../pages/PageTree'
import { TrashSection } from '../trash/TrashSection'
import { deletePage } from '../pages/pageService'
import { deleteNotebook, moveNotebook, renameNotebook } from './notebookService'

interface SidebarProps {
  db: LearningNotesDB
  workspaceId: string
  notebooks: Notebook[]
  currentPage: Page | null
  tree: TreeState
  theme: Theme
  onThemeChange: (theme: Theme) => void
  /** Notebook whose name is being edited inline (e.g. just created). */
  renamingNotebookId: string | null
  onRenamingChange: (id: string | null) => void
  onOpenPage: (pageId: string | null) => void
  onCreateNotebook: () => void
  onCreatePage: (notebookId: string, parentId: string | null) => void
}

/** A pending delete, waiting for the user to confirm. */
interface PendingDelete {
  message: string
  run: () => Promise<void>
}

/** Where a dragged notebook would land. */
interface DropTarget {
  id: string
  after: boolean
}

/** Left sidebar: notebooks (rename, delete, drag to reorder) and page trees. */
export function Sidebar({
  db,
  workspaceId,
  notebooks,
  currentPage,
  tree,
  theme,
  onThemeChange,
  renamingNotebookId,
  onRenamingChange,
  onOpenPage,
  onCreateNotebook,
  onCreatePage,
}: SidebarProps) {
  const [pending, setPending] = useState<PendingDelete | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const requestNotebookDelete = (notebook: Notebook) =>
    setPending({
      message: `Delete “${notebook.title}” and all its pages?`,
      run: async () => {
        await deleteNotebook(db, notebook.id)
        if (currentPage?.notebookId === notebook.id) onOpenPage(null)
      },
    })

  const requestPageDelete = (page: Page, affectsCurrent: boolean) =>
    setPending({
      message: `Delete “${page.title || 'Untitled'}” and its sub-pages?`,
      run: async () => {
        await deletePage(db, page.id)
        if (affectsCurrent) onOpenPage(page.parentId)
      },
    })

  const handleDragOver = (e: DragEvent, id: string) => {
    if (!dragId || dragId === id) return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const after = e.clientY > rect.top + rect.height / 2
    if (dropTarget?.id !== id || dropTarget.after !== after) {
      setDropTarget({ id, after })
    }
  }

  const handleDrop = () => {
    if (dragId && dropTarget) {
      const others = notebooks.filter((n) => n.id !== dragId)
      const index =
        others.findIndex((n) => n.id === dropTarget.id) +
        (dropTarget.after ? 1 : 0)
      runTask(moveNotebook(db, dragId, index))
    }
    setDragId(null)
    setDropTarget(null)
  }

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-line bg-side px-2 py-3.5 transition-colors duration-250">
      <div className="px-2.5 pt-1 pb-3.5 font-semibold tracking-[-0.01em]">
        ◐ Learning Notes
      </div>
      <div className="flex items-center justify-between px-2.5 pt-2.5 pb-1 text-[11px] tracking-[0.06em] text-muted uppercase">
        Notebooks
        <IconButton title="New notebook" onClick={onCreateNotebook}>
          +
        </IconButton>
      </div>

      <nav className="flex-1 overflow-auto">
        {notebooks.map((notebook) => {
          const open = tree.isNotebookOpen(notebook.id)
          const line =
            dropTarget?.id === notebook.id
              ? dropTarget.after
                ? 'shadow-[inset_0_-2px_0_var(--color-accent)]'
                : 'shadow-[inset_0_2px_0_var(--color-accent)]'
              : ''
          return (
            <div key={notebook.id}>
              <div
                draggable={renamingNotebookId !== notebook.id}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', notebook.id) // Firefox
                  setDragId(notebook.id)
                }}
                onDragOver={(e) => handleDragOver(e, notebook.id)}
                onDrop={handleDrop}
                onDragEnd={() => {
                  setDragId(null)
                  setDropTarget(null)
                }}
                className={`group flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-hover ${line} ${
                  dragId === notebook.id ? 'opacity-40' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => tree.toggleNotebook(notebook.id)}
                  aria-label={open ? 'Collapse' : 'Expand'}
                  className="w-3.5 text-center text-[10px] text-muted"
                >
                  {open ? '▾' : '▸'}
                </button>
                {renamingNotebookId === notebook.id ? (
                  <RenameInput
                    initial={notebook.title}
                    className="font-semibold"
                    onDone={(title) => {
                      onRenamingChange(null)
                      if (title) runTask(renameNotebook(db, notebook.id, title))
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => tree.toggleNotebook(notebook.id)}
                    onDoubleClick={() => onRenamingChange(notebook.id)}
                    className="flex-1 truncate text-left font-semibold"
                  >
                    {notebook.title || 'Untitled'}
                  </button>
                )}
                <span className="flex opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
                  <IconButton
                    title="Add page"
                    onClick={() => onCreatePage(notebook.id, null)}
                  >
                    +
                  </IconButton>
                  <IconButton
                    title="Rename"
                    onClick={() => onRenamingChange(notebook.id)}
                  >
                    ✎
                  </IconButton>
                  <IconButton
                    title="Delete notebook"
                    onClick={() => requestNotebookDelete(notebook)}
                  >
                    ×
                  </IconButton>
                </span>
              </div>
              {open && (
                <PageTree
                  db={db}
                  notebookId={notebook.id}
                  currentPageId={currentPage?.id ?? null}
                  tree={tree}
                  onOpen={onOpenPage}
                  onAddSubPage={(parentId) =>
                    onCreatePage(notebook.id, parentId)
                  }
                  onRequestDelete={requestPageDelete}
                />
              )}
            </div>
          )
        })}
        <TrashSection db={db} workspaceId={workspaceId} />
      </nav>

      <div role="group" aria-label="Theme" className="flex gap-1.5 p-2.5">
        {THEMES.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={theme === t}
            onClick={() => onThemeChange(t)}
            className={`flex-1 rounded-lg border bg-bg p-1.5 text-xs transition-colors ${
              theme === t ? 'border-accent text-accent' : 'border-line text-ink'
            }`}
          >
            {THEME_LABELS[t]}
          </button>
        ))}
      </div>

      {pending && (
        <ConfirmDialog
          message={pending.message}
          confirmLabel="Delete"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            setPending(null)
            runTask(pending.run())
          }}
        />
      )}
    </aside>
  )
}
