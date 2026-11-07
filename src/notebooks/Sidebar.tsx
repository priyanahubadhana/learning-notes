import { displayName, sampleName } from '../i18n/defaultNames'
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
import { SidebarGroup } from '../app/SidebarGroup'
import { altShortcutLabel, shortcutLabel } from '../app/keys'
import {
  ConfirmDialog,
  IconButton,
  MenuIcon,
  MenuPopover,
  RowMenuButton,
  RenameInput,
} from '../app/ui'
import type { TreeState } from '../app/useTreeState'
import type { LearningNotesDB } from '../core/db'
import type { Notebook, Page, SavedSearch } from '../core/types'
import { dateKey, shortDayLabel } from '../journal/dates'
import { PageTree } from '../pages/PageTree'
import { deletePage, getPage } from '../pages/pageService'
import { TemplatesSection } from '../templates/TemplatesSection'
import { SpacePlaceholder } from '../app/spaces/SpacePlaceholder'
import type { Space } from '../app/spaces/spaces'
import { SavedSearchesSection } from '../search/SavedSearchesSection'
import { TagsSection } from '../tags/TagsSection'
import { FavouritesSection, RecentSection } from '../app/QuickPages'
import { t } from '../i18n/t'
import { LazyNotebookMenu } from '../app/LazyNameSheet'
import { useRowPalmGuard } from '../app/useRowPalmGuard'
import { touchUi } from '../app/touchUi'
import { useLongPress } from '../app/useLongPress'
import type { ReviewScope } from '../recall/reviewService'
import { countDue } from '../recall/reviewLazy'
import { deleteNotebook, moveNotebook, renameNotebook } from './notebookService'

interface SidebarProps {
  db: LearningNotesDB
  workspaceId: string
  notebooks: Notebook[]
  currentPage: Page | null
  tree: TreeState
  /** The space whose contents are listed. */
  space: Space
  /** Notebook whose name is being edited inline (e.g. just created). */
  renamingNotebookId: string | null
  onRenamingChange: (id: string | null) => void
  onOpenPage: (pageId: string | null) => void
  /** On a phone the sidebar slides in over the page; true while it is shown. */
  drawerOpen?: boolean
  /** The user hid the sidebar (not on phones, where it is a drawer). */
  hidden?: boolean
  onCloseDrawer?: () => void
  /** The notebook whose tabs are open in the main area, if any. */
  openNotebookId: string | null
  onOpenNotebook: (notebookId: string) => void
  onOpenToday: () => void
  /** The Library space's list (made by the Library feature, passed in by App). */
  libraryPanel?: React.ReactNode
  /** True while the global Review screen is shown. */
  reviewOpen: boolean
  /** The Search screen is open (highlights its button). */
  searchOpen: boolean
  /** Opens the search popup. */
  onOpenSearch: () => void
  /** Opens the Calendar screen. */
  onOpenCalendar: () => void
  calendarOpen: boolean
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
  /** Opens the whole-app Summary (Phase M). */
  onOpenSummaries: () => void
  summariesOpen: boolean
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
  space,
  renamingNotebookId,
  onRenamingChange,
  onOpenPage,
  drawerOpen = false,
  hidden = false,
  onCloseDrawer,
  openNotebookId,
  onOpenNotebook,
  onOpenToday,
  libraryPanel,
  reviewOpen,
  onOpenReview,
  onOpenAllCards,
  allCardsOpen,
  onOpenSummaries,
  summariesOpen,
  onOpenAllDatabases,
  allDatabasesOpen,
  searchOpen,
  onOpenSearch,
  onOpenCalendar,
  calendarOpen,
  savedSearchId,
  onOpenSavedSearch,
  onReviewSavedSearch,
  onOpenTag,
  onNotesRewritten,
  onCreateNotebook,
  onCreatePage,
  onCreateTemplate,
}: SidebarProps) {
  const { chooseTemplate, toast, askName } = useContext(AppUiContext)
  useRowPalmGuard()
  // Touch and Pencil: names are typed in the "Name it" sheet, rows show only ⋯.
  const touch = touchUi()
  const rename = (nb: Notebook) =>
    touch
      ? runTask(
          askName(t('sidebar.rename.title'), nb.title).then((name) =>
            name ? renameNotebook(db, nb.id, name) : undefined,
          ),
        )
      : onRenamingChange(nb.id)
  const [pending, setPending] = useState<PendingDelete | null>(null)
  const [addMenu, setAddMenu] = useState<AddMenu | null>(null)
  // Touch: press and hold a notebook row for the same actions as its icons.
  const [rowMenu, setRowMenu] = useState<{
    id: string
    anchor: DOMRect
  } | null>(null)
  const hold = useLongPress((x, y) => {
    const row = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>('[data-notebook-row]')
    if (row) {
      setRowMenu({
        id: row.dataset.notebookRow!,
        anchor: row.getBoundingClientRect(),
      })
    }
  }, true)

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
      message: t('sidebar.confirm.template', {
        name: template.title || t('review.untitled'),
      }),
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
      message: t('sidebar.confirm.notebook', {
        name: sampleName(notebook),
      }),
      run: async () => {
        await deleteNotebook(db, notebook.id)
        if (currentPage?.notebookId === notebook.id) onOpenPage(null)
      },
    })

  const requestPageDelete = (page: Page, affectsCurrent: boolean) =>
    setPending({
      message: t('sidebar.confirm.page', {
        name: sampleName(page) || t('review.untitled'),
      }),
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

  const studyGroup = (
    <SidebarGroup id="study" title={t('sidebar.group.study')} defaultOpen>
      <Tip id="sidebar.review" className="flex">
        <button
          type="button"
          onClick={() => onOpenReview({ kind: 'all' })}
          aria-current={reviewOpen ? 'page' : undefined}
          className={`flex min-h-9 any-pointer-coarse:min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-hover ${
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
          className={`flex min-h-9 any-pointer-coarse:min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-hover ${
            allCardsOpen ? 'bg-hover font-semibold' : ''
          }`}
        >
          <span aria-hidden className="text-muted">
            ▤
          </span>
          {t('sidebar.allCards')}
        </button>
      </Tip>
      <Tip id="sidebar.allSummaries" className="flex">
        <button
          type="button"
          onClick={onOpenSummaries}
          aria-current={summariesOpen ? 'page' : undefined}
          className={`flex min-h-9 any-pointer-coarse:min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-hover ${
            summariesOpen ? 'bg-hover font-semibold' : ''
          }`}
        >
          <span aria-hidden className="text-muted">
            ≡
          </span>
          {t('summary.sidebar')}
        </button>
      </Tip>
    </SidebarGroup>
  )

  return (
    <aside
      data-chrome
      id="sidebar"
      data-palm-guard
      aria-label={t('sidebar.label')}
      style={{ paddingTop: 'calc(14px + var(--top-clear))' }}
      className={`${hidden ? 'wide:hidden' : ''} flex w-[min(var(--sidebar-width,260px),50vw)] shrink-0 flex-col overflow-y-auto border-r border-line bg-side px-2 py-3.5 transition-colors duration-250 phone:fixed phone:top-0 phone:bottom-14 phone:left-0 phone:z-40 phone:w-[min(300px,85vw)] phone:shadow-[0_0_32px_rgba(0,0,0,0.25)] phone:transition-[transform,visibility] phone:duration-200 ${
        drawerOpen
          ? 'phone:translate-x-0'
          : 'phone:invisible phone:-translate-x-full'
      }`}
    >
      <div className="flex items-center gap-1 pb-3.5 font-semibold tracking-[-0.01em] phone:-mt-1.5 phone:pb-2">
        {drawerOpen && (
          // Sits exactly where the button that opened the menu was.
          <button
            type="button"
            aria-label={t('nav.closeMenu')}
            aria-controls="sidebar"
            aria-expanded
            onClick={onCloseDrawer}
            className="hidden size-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-hover phone:flex"
          >
            <MenuIcon />
          </button>
        )}
        <span className="px-2.5 pt-1 phone:px-1 phone:pt-0">
          ◐ Learning Notes
        </span>
      </div>
      {space === 'notebooks' && (
        <Tip id="sidebar.today" className="flex">
          <button
            type="button"
            onClick={onOpenToday}
            aria-label={t('sidebar.openToday')}
            className="mb-1 flex min-h-9 any-pointer-coarse:min-h-11 w-full items-center gap-2 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-left text-sm transition-colors hover:border-accent"
          >
            <span aria-hidden>☀</span>
            <span className="flex-1">
              {t('sidebar.todayLabel', {
                date: shortDayLabel(dateKey(new Date())),
              })}
            </span>
            <kbd className="rounded border border-line bg-side px-1 font-mono text-[11px] text-muted">
              {altShortcutLabel('T')}
            </kbd>
          </button>
        </Tip>
      )}
      <Tip id="sidebar.search" className="flex">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-current={searchOpen ? 'page' : undefined}
          className={`flex min-h-9 any-pointer-coarse:min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-hover ${
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
      <nav
        aria-label={t('sidebar.groups')}
        className="min-h-32 flex-1 overflow-auto pt-2"
        {...hold}
      >
        {(space === 'notebooks' || space === 'review') && studyGroup}
        {space === 'notebooks' && (
          <>
            <SidebarGroup
              id="quick"
              title={t('sidebar.group.quick')}
              defaultOpen
            >
              <FavouritesSection
                db={db}
                currentPageId={currentPage?.id ?? null}
                onOpen={onOpenPage}
              />
              <RecentSection
                db={db}
                currentPageId={currentPage?.id ?? null}
                onOpen={onOpenPage}
              />
              <Tip id="sidebar.calendar" className="flex">
                <button
                  type="button"
                  onClick={onOpenCalendar}
                  aria-current={calendarOpen ? 'page' : undefined}
                  className={`flex min-h-9 any-pointer-coarse:min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-hover ${
                    calendarOpen ? 'bg-hover font-semibold' : ''
                  }`}
                >
                  <span aria-hidden className="text-muted">
                    ▦
                  </span>
                  {t('sidebar.calendar')}
                </button>
              </Tip>
              <Tip id="sidebar.allDatabases" className="flex">
                <button
                  type="button"
                  onClick={onOpenAllDatabases}
                  aria-current={allDatabasesOpen ? 'page' : undefined}
                  className={`flex min-h-9 any-pointer-coarse:min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-hover ${
                    allDatabasesOpen ? 'bg-hover font-semibold' : ''
                  }`}
                >
                  <span aria-hidden className="text-muted">
                    ◫
                  </span>
                  {t('sidebar.allDatabases')}
                </button>
              </Tip>
            </SidebarGroup>
            <SidebarGroup
              id="notebooks"
              prefKey="notebooksOpen"
              title={t('sidebar.notebooks')}
              defaultOpen
              action={
                <IconButton
                  title={t('sidebar.newNotebook.title')}
                  tip="sidebar.newNotebook"
                  onClick={onCreateNotebook}
                >
                  +
                </IconButton>
              }
            >
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
                      data-notebook-row={notebook.id}
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
                      className={`group flex min-h-9 items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-hover ${line} ${
                        openNotebookId === notebook.id ? 'bg-hover' : ''
                      } ${dragId === notebook.id ? 'opacity-40' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => tree.toggleNotebook(notebook.id)}
                        aria-label={t(open ? 'tree.collapse' : 'tree.expand')}
                        className="w-3.5 text-center text-[10px] text-muted"
                      >
                        {open ? '▾' : '▸'}
                      </button>
                      {renamingNotebookId === notebook.id && !touch ? (
                        <RenameInput
                          initial={notebook.title}
                          className="font-semibold"
                          onDone={(title) => {
                            onRenamingChange(null)
                            if (title)
                              runTask(renameNotebook(db, notebook.id, title))
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
                              openNotebookId === notebook.id
                                ? 'page'
                                : undefined
                            }
                            onDoubleClick={() => rename(notebook)}
                            className="line-clamp-2 flex-1 text-left font-semibold break-words"
                          >
                            {notebook.locked ? '🔒 ' : ''}
                            {displayName(sampleName(notebook)) ||
                              t('review.untitled')}
                          </button>
                        </NotebookTip>
                      )}
                      <RowMenuButton
                        name={sampleName(notebook)}
                        onOpen={(anchor) =>
                          setRowMenu({ id: notebook.id, anchor })
                        }
                      />
                      <span className="flex opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 any-pointer-coarse:hidden">
                        {notebook.kind !== 'journal' && (
                          <IconButton
                            title={t('sidebar.addPage.title')}
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
                          title={t('sidebar.rename.title')}
                          tip="sidebar.rename"
                          onClick={() => rename(notebook)}
                        >
                          ✎
                        </IconButton>
                        <IconButton
                          title={t('sidebar.deleteNotebook.title')}
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
            </SidebarGroup>
            <TagsSection
              db={db}
              onOpenTag={onOpenTag}
              onNotesRewritten={onNotesRewritten}
            />
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
          </>
        )}
        {(space === 'notebooks' || space === 'review') && (
          <SavedSearchesSection
            db={db}
            activeId={savedSearchId}
            onOpen={onOpenSavedSearch}
            onReview={onReviewSavedSearch}
          />
        )}
        {space === 'home' && (
          <SpacePlaceholder space="home" onOpenToday={onOpenToday} compact />
        )}
        {space === 'library' &&
          (libraryPanel ?? <SpacePlaceholder space="library" compact />)}
      </nav>
      {addMenu && (
        <MenuPopover
          anchor={addMenu.anchor}
          onClose={() => setAddMenu(null)}
          items={[
            {
              label: t('sidebar.blankPage'),
              icon: '📄',
              onSelect: () =>
                onCreatePage(addMenu.notebookId, addMenu.parentId),
            },
            {
              label: t('sidebar.fromTemplate'),
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

      {rowMenu &&
        (() => {
          const at = notebooks.findIndex((n) => n.id === rowMenu.id)
          if (at < 0) return null
          const notebook = notebooks[at]
          return (
            <LazyNotebookMenu
              db={db}
              notebook={notebook}
              index={at}
              count={notebooks.length}
              anchor={rowMenu.anchor}
              toast={toast}
              onAddPage={() => openAddMenu(rowMenu.anchor, notebook.id, null)}
              onReview={() =>
                onOpenReview({ kind: 'notebook', notebookId: notebook.id })
              }
              onRename={() => rename(notebook)}
              onDelete={() => requestNotebookDelete(notebook)}
              onClose={() => setRowMenu(null)}
            />
          )
        })()}

      {pending && (
        <ConfirmDialog
          message={pending.message}
          confirmLabel={t('ui.delete')}
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
      hold={false}
    >
      {children}
    </Tip>
  )
}
