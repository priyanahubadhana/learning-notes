import { useLiveQuery } from 'dexie-react-hooks'
import {
  useContext,
  useEffect,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react'
import { Tip } from '../help/Help'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { THEMES, THEME_LABELS, type Theme } from '../app/theme'
import { shortcutLabel } from '../app/keys'
import { ConfirmDialog, IconButton, MenuPopover, RenameInput } from '../app/ui'
import type { TreeState } from '../app/useTreeState'
import type { LearningNotesDB } from '../core/db'
import type { Notebook, Page, SavedSearch } from '../core/types'
import { dateKey, shortDayLabel } from '../journal/dates'
import { PageTree } from '../pages/PageTree'
import { deletePage, getPage } from '../pages/pageService'
import { TemplatesSection } from '../templates/TemplatesSection'
import { TrashSection } from '../trash/TrashSection'
import { SavedSearchesSection } from '../search/SavedSearchesSection'
import { TagsSection } from '../tags/TagsSection'
import { t } from '../i18n/t'
import { countDue, type ReviewScope } from '../recall/reviewService'
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
  /** The notebook whose tabs are open in the main area, if any. */
  openNotebookId: string | null
  onOpenNotebook: (notebookId: string) => void
  onOpenToday: () => void
  /** True while the Settings screen is shown. */
  settingsOpen: boolean
  onOpenSettings: () => void
  /** True while the global Review screen is shown. */
  reviewOpen: boolean
  /** The Search screen is open (highlights its button). */
  searchOpen: boolean
  /** Opens the search popup. */
  onOpenSearch: () => void
  /** The saved search open in the Search screen, if any. */
  savedSearchId: string | null
  onOpenSavedSearch: (saved: SavedSearch) => void
  onReviewSavedSearch: (saved: SavedSearch) => void
  onOpenTag: (tagId: string) => void
  /** A tag merge/delete rewrote these pages' notes. */
  onNotesRewritten: (pageIds: string[]) => void
  onOpenReview: (scope: ReviewScope) => void
  onOpenAllCards: () => void
  allCardsOpen: boolean
  onOpenAllDatabases: () => void
  allDatabasesOpen: boolean
  onCreateNotebook: () => void
  /** `templateId`: copy that template's content into the new page. */
  onCreatePage: (
    notebookId: string,
    parentId: string | null,
    templateId?: string,
  ) => void
  onCreateTemplate: () => void
}

/** The open "+" menu (Blank page / From template…). */
interface AddMenu {
  anchor: DOMRect
  notebookId: string
  parentId: string | null
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
  openNotebookId,
  onOpenNotebook,
  onOpenToday,
  settingsOpen,
  onOpenSettings,
  reviewOpen,
  onOpenReview,
  onOpenAllCards,
  allCardsOpen,
  onOpenAllDatabases,
  allDatabasesOpen,
  searchOpen,
  onOpenSearch,
  savedSearchId,
  onOpenSavedSearch,
  onReviewSavedSearch,
  onOpenTag,
  onNotesRewritten,
  onCreateNotebook,
  onCreatePage,
  onCreateTemplate,
}: SidebarProps) {
  const { chooseTemplate } = useContext(AppUiContext)
  const [pending, setPending] = useState<PendingDelete | null>(null)
  const [addMenu, setAddMenu] = useState<AddMenu | null>(null)

  // Due count for the Review button; re-checked every minute so cards
  // that come due (e.g. after Again) show up without other changes.
  const [minute, setMinute] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setMinute(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  // `minute` only triggers the re-check; the count uses the exact time.
  const dueCount = useLiveQuery(async () => {
    // Counting the whole table makes the live query also re-run when a
    // card is added or rescheduled outside the "due by now" range.
    await db.cards.count()
    return countDue(db, Date.now())
  }, [db, minute])

  const openAddMenu = (
    anchor: DOMRect,
    notebookId: string,
    parentId: string | null,
  ) => setAddMenu({ anchor, notebookId, parentId })

  const requestTemplateDelete = (template: Page) =>
    setPending({
      message: `Delete the template “${template.title || 'Untitled'}”? Pages made from it stay as they are.`,
      run: async () => {
        await deletePage(db, template.id)
        // Also when the open page was one of the template's sub-pages.
        if (currentPage && !(await getPage(db, currentPage.id))) {
          onOpenPage(null)
        }
      },
    })
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
      <Tip id="sidebar.today" className="flex">
        <button
          type="button"
          onClick={onOpenToday}
          aria-label="Open today’s journal"
          className="mb-2 flex w-full items-center gap-2 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-left text-sm transition-colors hover:border-accent"
        >
          <span aria-hidden>☀</span>
          <span className="flex-1">
            Today · {shortDayLabel(dateKey(new Date()))}
          </span>
          <kbd className="rounded border border-line bg-side px-1 font-mono text-[11px] text-muted">
            Alt+T
          </kbd>
        </button>
      </Tip>
      <Tip id="sidebar.search" className="flex">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-current={searchOpen ? 'page' : undefined}
          className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-hover ${
            searchOpen ? 'bg-hover font-semibold' : ''
          }`}
        >
          <span aria-hidden className="text-muted">
            🔍
          </span>
          <span className="flex-1">{t('search.sidebar')}</span>
          <kbd className="rounded border border-line bg-side px-1 font-mono text-[11px] text-muted">
            {shortcutLabel('K')}
          </kbd>
        </button>
      </Tip>
      <Tip id="sidebar.review" className="flex">
        <button
          type="button"
          onClick={() => onOpenReview({ kind: 'all' })}
          aria-current={reviewOpen ? 'page' : undefined}
          className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-hover ${
            reviewOpen ? 'bg-hover font-semibold' : ''
          }`}
        >
          <span aria-hidden className="text-muted">
            ⟳
          </span>
          <span className="flex-1">{t('review.sidebar')}</span>
          {dueCount !== undefined && dueCount > 0 && (
            <span
              aria-label={t('review.dueCount', { count: dueCount })}
              className="rounded-full bg-accent px-2 text-[12px] leading-5 font-medium text-white tabular-nums"
            >
              {dueCount}
            </span>
          )}
        </button>
      </Tip>
      <Tip id="sidebar.allCards" className="flex">
        <button
          type="button"
          onClick={onOpenAllCards}
          aria-current={allCardsOpen ? 'page' : undefined}
          className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-hover ${
            allCardsOpen ? 'bg-hover font-semibold' : ''
          }`}
        >
          <span aria-hidden className="text-muted">
            ▤
          </span>
          {t('sidebar.allCards')}
        </button>
      </Tip>
      <Tip id="sidebar.allDatabases" className="mb-2 flex">
        <button
          type="button"
          onClick={onOpenAllDatabases}
          aria-current={allDatabasesOpen ? 'page' : undefined}
          className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-hover ${
            allDatabasesOpen ? 'bg-hover font-semibold' : ''
          }`}
        >
          <span aria-hidden className="text-muted">
            ◫
          </span>
          {t('sidebar.allDatabases')}
        </button>
      </Tip>
      <SavedSearchesSection
        db={db}
        activeId={savedSearchId}
        onOpen={onOpenSavedSearch}
        onReview={onReviewSavedSearch}
      />
      <nav className="flex-1 overflow-auto">
        <TagsSection
          db={db}
          onOpenTag={onOpenTag}
          onNotesRewritten={onNotesRewritten}
        />
        <div className="flex items-center justify-between px-2.5 pt-2.5 pb-1 text-[11px] tracking-[0.06em] text-muted uppercase">
          Notebooks
          <IconButton
            title="New notebook"
            tip="sidebar.newNotebook"
            onClick={onCreateNotebook}
          >
            +
          </IconButton>
        </div>
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
                  openNotebookId === notebook.id ? 'bg-hover' : ''
                } ${dragId === notebook.id ? 'opacity-40' : ''}`}
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
                  <NotebookTip special={!!notebook.kind}>
                    <button
                      type="button"
                      onClick={() => {
                        // A normal notebook opens (its tabs); special ones fold.
                        if (notebook.kind) {
                          tree.toggleNotebook(notebook.id)
                          return
                        }
                        tree.expandNotebook(notebook.id)
                        onOpenNotebook(notebook.id)
                      }}
                      aria-current={
                        openNotebookId === notebook.id ? 'page' : undefined
                      }
                      onDoubleClick={() => onRenamingChange(notebook.id)}
                      className="flex-1 truncate text-left font-semibold"
                    >
                      {notebook.title || 'Untitled'}
                    </button>
                  </NotebookTip>
                )}
                <span className="flex opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
                  {notebook.kind !== 'journal' && (
                    <IconButton
                      title="Add page"
                      tip="sidebar.addPage"
                      onClick={(e) =>
                        openAddMenu(
                          e.currentTarget.getBoundingClientRect(),
                          notebook.id,
                          null,
                        )
                      }
                    >
                      +
                    </IconButton>
                  )}
                  {notebook.kind !== 'templates' && (
                    <IconButton
                      title={t('review.thisNotebook')}
                      tip="sidebar.reviewNotebook"
                      onClick={() =>
                        onOpenReview({
                          kind: 'notebook',
                          notebookId: notebook.id,
                        })
                      }
                    >
                      ⟳
                    </IconButton>
                  )}
                  <IconButton
                    title="Rename"
                    tip="sidebar.rename"
                    onClick={() => onRenamingChange(notebook.id)}
                  >
                    ✎
                  </IconButton>
                  <IconButton
                    title="Delete notebook"
                    tip="sidebar.deleteNotebook"
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
                  journal={notebook.kind === 'journal'}
                  onOpen={onOpenPage}
                  onAddSubPage={(parentId, anchor) =>
                    openAddMenu(anchor, notebook.id, parentId)
                  }
                  onRequestDelete={requestPageDelete}
                />
              )}
            </div>
          )
        })}
        <TemplatesSection
          db={db}
          workspaceId={workspaceId}
          currentPageId={currentPage?.id ?? null}
          tree={tree}
          onOpen={onOpenPage}
          onCreate={onCreateTemplate}
          onRequestDelete={requestTemplateDelete}
          onRequestPageDelete={requestPageDelete}
        />
        <TrashSection db={db} workspaceId={workspaceId} />
      </nav>

      {addMenu && (
        <MenuPopover
          anchor={addMenu.anchor}
          onClose={() => setAddMenu(null)}
          items={[
            {
              label: 'Blank page',
              icon: '📄',
              onSelect: () =>
                onCreatePage(addMenu.notebookId, addMenu.parentId),
            },
            {
              label: 'From template…',
              icon: '📋',
              onSelect: () =>
                runTask(
                  chooseTemplate('new').then((templateId) => {
                    if (templateId === null) return // cancelled
                    onCreatePage(
                      addMenu.notebookId,
                      addMenu.parentId,
                      templateId || undefined,
                    )
                  }),
                ),
            },
          ]}
        />
      )}

      <Tip id="sidebar.settings" className="flex">
        <button
          type="button"
          onClick={onOpenSettings}
          aria-current={settingsOpen ? 'page' : undefined}
          className={`mx-0.5 mt-1 flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-hover ${
            settingsOpen ? 'bg-hover font-semibold' : ''
          }`}
        >
          <span aria-hidden className="text-muted">
            ⚙
          </span>
          {t('settings.title')}
        </button>
      </Tip>
      <Tip id="sidebar.theme" className="flex" touchInfo={false}>
        <div
          role="group"
          aria-label="Theme"
          className="flex flex-1 gap-1.5 p-2.5"
        >
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={theme === t}
              onClick={() => onThemeChange(t)}
              className={`flex-1 rounded-lg border bg-bg p-1.5 text-xs transition-colors ${
                theme === t
                  ? 'border-accent text-accent'
                  : 'border-line text-ink'
              }`}
            >
              {THEME_LABELS[t]}
            </button>
          ))}
        </div>
      </Tip>

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

/** A notebook's name with its tip (special notebooks only fold, no tip). */
function NotebookTip({
  special,
  children,
}: {
  special: boolean
  children: ReactNode
}) {
  return special ? (
    <>{children}</>
  ) : (
    <Tip
      id="sidebar.notebook"
      className="flex min-w-0 flex-1"
      touchInfo={false}
    >
      {children}
    </Tip>
  )
}
