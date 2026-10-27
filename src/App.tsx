import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import {
  AppUiContext,
  type AppUi,
  type ChoiceRequest,
  type PickerMode,
} from './app/appUi'
import { runTask } from './app/errors'
import { applyTheme } from './app/theme'
import { ThemeContext } from './app/themeContext'
import type { ToastAction } from './app/appUi'
import { Toast, ChoiceDialog } from './app/ui'
import { isStringOrNull } from './app/uiPrefs'
import { usePref } from './app/usePref'
import { t } from './i18n/t'
import { useTreeState } from './app/useTreeState'
import { db } from './core/db'
import type { Page, SavedSearch, Workspace } from './core/types'
import { getOrCreateDefaultWorkspace } from './core/workspaceService'
import { ensureSearchIndex } from './search/searchService'
import { openJournalDay } from './journal/journalService'
import { NotebookScreen } from './notebooks/NotebookScreen'
import { Sidebar } from './notebooks/Sidebar'
import { createNotebook, listNotebooks } from './notebooks/notebookService'
import { PageView } from './pages/PageView'
import { createPage, getPage } from './pages/pageService'
import { AllCardsScreen } from './recall/AllCardsScreen'
import { DatabaseScreen, DatabasesScreen } from './databases/DatabasesHub'
import { ReviewScreen } from './recall/ReviewScreen'
import type { ReviewScope } from './recall/reviewService'
import { theme as themeSetting } from './settings/builtinSettings'
import { SettingsScreen } from './settings/SettingsScreen'
import { useDeviceSetting } from './settings/useSetting'
import { TemplatePicker } from './templates/TemplatePicker'
import { revealBlock } from './editor/revealBlock'
import { rememberPage } from './search/recentPages'
import { SearchPopup } from './search/SearchPopup'
import {
  DEFAULT_FILTERS,
  describeHits,
  runSearch,
  type SearchHit,
  type SearchQuery,
} from './search/searchQuery'
import { getSavedSearch, readSavedQuery } from './search/savedSearchService'
import { SaveSearchActions } from './search/SaveSearchActions'
import { SearchScreen } from './search/SearchScreen'
import { restorePage } from './trash/trashService'
import {
  createPageFromTemplate,
  createTemplate,
  ensureTemplates,
} from './templates/templateService'

// Cached so React StrictMode's double effect cannot create things twice.
let workspacePromise: Promise<Workspace> | undefined

/** An open question (AppUi.choose), waiting for the user's answer. */
interface ChoiceState {
  request: ChoiceRequest
  resolve: (value: string | null) => void
}

/** An open template picker, waiting for the user's choice. */
interface PickerRequest {
  mode: PickerMode
  resolve: (result: string | null) => void
}

/**
 * App shell: sidebar + open page, template picker and toasts.
 * Keyboard: Alt+N, Alt+Shift+N, Alt+T (README).
 */
function App() {
  const [workspace, setWorkspace] = useState<Workspace>()
  const [currentPageId, setCurrentPageId] = usePref(
    'currentPage',
    isStringOrNull,
    null,
  )
  // An open notebook (its tabs) replaces the open page the same way.
  const [notebookId, setNotebookId] = usePref(
    'currentNotebook',
    isStringOrNull,
    null,
  )
  // Settings replaces the open page in the main area until a page is opened.
  const [showSettings, setShowSettings] = useState(false)
  // Setting to scroll to and highlight when Settings opens (e.g. from a dialog).
  const [settingsFocus, setSettingsFocus] = useState<string | null>(null)
  const openSettings = (settingId?: string) => {
    setHub(null)
    setReviewScope(null)
    setSearch(null)
    setNotebookId(null)
    setSettingsFocus(settingId ?? null)
    setShowSettings(true)
  }
  // "All cards", "All databases" and one open database replace the page too.
  const [hub, setHub] = useState<
    | { kind: 'cards' }
    | { kind: 'databases' }
    | { kind: 'database'; id: string }
    | null
  >(null)
  // Review replaces the open page the same way (null = not reviewing).
  const [reviewScope, setReviewScope] = useState<ReviewScope | null>(null)
  // The Search screen replaces the open page the same way. `key` starts
  // it afresh each time a search is opened from outside it.
  const [search, setSearch] = useState<{
    query: SearchQuery
    key: number
    /** Set when a saved search is open. */
    savedId?: string
  } | null>(null)
  const [searchPopup, setSearchPopup] = useState(false)
  /** Opens a notebook's tabs (Notes · Database · Cards). */
  const openNotebook = (id: string) => {
    setHub(null)
    setShowSettings(false)
    setReviewScope(null)
    setSearch(null)
    setNotebookId(id)
  }
  const openPage = (id: string | null) => {
    setHub(null)
    setShowSettings(false)
    setReviewScope(null)
    setSearch(null)
    setNotebookId(null)
    setCurrentPageId(id)
    if (id) rememberPage(id)
  }
  const openReview = (scope: ReviewScope) => {
    setHub(null)
    setShowSettings(false)
    setSearch(null)
    setNotebookId(null)
    setReviewScope(scope)
  }
  const openSearch = (query: SearchQuery, savedId?: string) => {
    setHub(null)
    setShowSettings(false)
    setReviewScope(null)
    setSearchPopup(false)
    setNotebookId(null)
    setSearch({ query, key: Date.now(), savedId })
  }
  /** Search screen showing everything with a tag. */
  const openTag = (tagId: string) =>
    openSearch({
      text: '',
      type: 'all',
      filters: { ...DEFAULT_FILTERS, tagId },
    })
  const savedSearch = useLiveQuery(
    async () =>
      search?.savedId ? getSavedSearch(db, search.savedId) : undefined,
    [search?.savedId],
  )
  /** Reviews the cards a saved search finds (a deck). */
  const reviewSavedSearch = async (saved: SavedSearch) => {
    const { hits } = await runSearch(db, readSavedQuery(saved.query))
    const blockIds = hits.flatMap((h) =>
      h.type === 'card' && h.blockId ? [h.blockId] : [],
    )
    openReview({ kind: 'blocks', blockIds, name: saved.name })
  }
  /** Opens a search result at its block; one in the Trash offers Restore. */
  const openHit = async (hit: SearchHit) => {
    if (hit.deleted) {
      const name = (await describeHits(db, [hit])).get(hit.id)?.pageTitle
      appUi.toast(t('search.trashed', { name: name || t('review.untitled') }), {
        label: t('search.restore'),
        onSelect: () =>
          runTask(
            (async () => {
              await restorePage(db, hit.pageId)
              openPage(hit.pageId)
              if (hit.blockId) revealBlock(hit.blockId)
            })(),
          ),
      })
      return
    }
    openPage(hit.pageId)
    if (hit.blockId) revealBlock(hit.blockId)
  }
  const [renamingNotebookId, setRenamingNotebookId] = useState<string | null>(
    null,
  )
  const tree = useTreeState()
  const [theme, setTheme] = useDeviceSetting(themeSetting)
  useEffect(() => applyTheme(theme), [theme])

  useEffect(() => {
    workspacePromise ??= (async () => {
      const ws = await getOrCreateDefaultWorkspace(db)
      await ensureTemplates(db, ws.id) // starter templates on first run
      // Indexes notes saved before search existed; runs in the background.
      ensureSearchIndex(db).catch((error: unknown) =>
        console.error('Could not build the search index', error),
      )
      return ws
    })()
    workspacePromise.then(setWorkspace, (error: unknown) =>
      console.error('Could not open workspace', error),
    )
  }, [])

  // Live data. undefined = still loading.
  const notebooks = useLiveQuery(
    () => workspace && listNotebooks(db, workspace.id),
    [workspace],
  )
  const openNotebookRecord = notebooks?.find(
    (n) => n.id === notebookId && !n.kind,
  )
  const currentPage = useLiveQuery(
    async () =>
      currentPageId ? ((await getPage(db, currentPageId)) ?? null) : null,
    [currentPageId],
  )

  // ---- App-wide UI: template picker and toasts ----
  const [picker, setPicker] = useState<PickerRequest | null>(null)
  const [choice, setChoice] = useState<ChoiceState | null>(null)
  const [toastMessage, setToastMessage] = useState<{
    message: string
    action?: ToastAction
  } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const appUi: AppUi = {
    chooseTemplate: (mode) =>
      new Promise((resolve) => setPicker({ mode, resolve })),
    choose: (request) =>
      new Promise((resolve) => setChoice({ request, resolve })),
    openSettings,
    toast: (message, action) => {
      // Choosing the action also closes the toast.
      const closing = action && {
        ...action,
        onSelect: () => {
          setToastMessage(null)
          action.onSelect()
        },
      }
      setToastMessage({ message, action: closing })
      clearTimeout(toastTimer.current)
      // Toasts with an action stay longer, so there is time to tap it.
      toastTimer.current = setTimeout(
        () => setToastMessage(null),
        action ? 6000 : 3200,
      )
    },
  }

  // A newly created page whose title should get the cursor.
  // Bumped when a tag merge/delete rewrites the open page's notes.
  const [notesVersion, setNotesVersion] = useState(0)
  const [focusTitlePageId, setFocusTitlePageId] = useState<string | null>(null)

  /** Shows a just-created page: reveal it in the sidebar and open it. */
  const openNewPage = (page: Page, focusTitle = true) => {
    tree.expandNotebook(page.notebookId)
    if (page.parentId) tree.expandPage(page.parentId)
    setFocusTitlePageId(focusTitle ? page.id : null)
    openPage(page.id)
  }

  const createPageIn = async (
    notebookId: string,
    parentId: string | null,
    focusTitle = true,
    templateId?: string,
  ) => {
    const page = templateId
      ? await createPageFromTemplate(db, notebookId, parentId, templateId)
      : await createPage(db, notebookId, parentId)
    openNewPage(page, focusTitle)
    if (templateId) {
      const template = await getPage(db, templateId)
      appUi.toast(`New page from “${template?.title || 'template'}”`)
    }
  }

  const createNotebookAndOpen = async () => {
    if (!workspace) return
    const notebook = await createNotebook(db, workspace.id, 'New notebook')
    setRenamingNotebookId(notebook.id)
    // The notebook name field keeps the cursor, not the page title.
    await createPageIn(notebook.id, null, false)
  }

  /** "New page from this template": in the first normal notebook. */
  const newPageFromTemplate = async (templateId: string) => {
    if (!workspace) return
    const target =
      notebooks?.find((n) => !n.kind) ??
      (await createNotebook(db, workspace.id, 'My Notebook'))
    await createPageIn(target.id, null, true, templateId)
  }

  const openToday = async () => {
    if (!workspace) return
    const { page, created } = await openJournalDay(db, workspace.id)
    openNewPage(page, false)
    if (created) {
      appUi.toast('Created today’s page from the “Daily journal” template')
    }
  }

  const newTemplate = async () => {
    if (!workspace) return
    openNewPage(await createTemplate(db, workspace.id))
  }

  // Keyboard shortcuts (handler kept in a ref so it always sees fresh state).
  const onShortcut = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    onShortcut.current = (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return
      if (e.code === 'KeyT' && !e.shiftKey) {
        // Alt+T: today's journal page
        e.preventDefault()
        runTask(openToday())
        return
      }
      if (e.code !== 'KeyN') return
      e.preventDefault()
      if (e.shiftKey) {
        // Alt+Shift+N: new sub-page of the open page
        if (currentPage)
          runTask(createPageIn(currentPage.notebookId, currentPage.id))
        return
      }
      // Alt+N: new page in the current (or first) notebook
      const notebookId = currentPage?.notebookId ?? notebooks?.[0]?.id
      runTask(
        notebookId ? createPageIn(notebookId, null) : createNotebookAndOpen(),
      )
    }
  })
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onShortcut.current(e)
    window.addEventListener('keydown', listener)
    // Ctrl+K / ⌘K: search, from anywhere. Caught before the editor sees it.
    const searchKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.code === 'KeyK') {
        e.preventDefault()
        e.stopPropagation()
        setSearchPopup(true)
      }
    }
    window.addEventListener('keydown', searchKey, { capture: true })
    return () => {
      window.removeEventListener('keydown', listener)
      window.removeEventListener('keydown', searchKey, { capture: true })
    }
  }, [])

  if (!workspace || !notebooks) return null // loading (a split second)

  return (
    <ThemeContext value={theme}>
      <AppUiContext value={appUi}>
        <div className="flex h-screen">
          <Sidebar
            db={db}
            workspaceId={workspace.id}
            notebooks={notebooks}
            currentPage={currentPage ?? null}
            tree={tree}
            theme={theme}
            onThemeChange={setTheme}
            renamingNotebookId={renamingNotebookId}
            onRenamingChange={setRenamingNotebookId}
            onOpenPage={openPage}
            openNotebookId={openNotebookRecord?.id ?? null}
            onOpenNotebook={openNotebook}
            onOpenToday={() => runTask(openToday())}
            onCreateNotebook={() => runTask(createNotebookAndOpen())}
            onCreatePage={(notebookId, parentId, templateId) =>
              runTask(createPageIn(notebookId, parentId, true, templateId))
            }
            onCreateTemplate={() => runTask(newTemplate())}
            settingsOpen={showSettings}
            onOpenSettings={() => openSettings()}
            reviewOpen={
              reviewScope?.kind === 'all' || reviewScope?.kind === 'wrong'
            }
            onOpenReview={openReview}
            onOpenAllCards={() => {
              openPage(null)
              setHub({ kind: 'cards' })
            }}
            allCardsOpen={
              hub?.kind === 'cards' && !showSettings && !reviewScope
            }
            onOpenAllDatabases={() => {
              openPage(null)
              setHub({ kind: 'databases' })
            }}
            allDatabasesOpen={
              (hub?.kind === 'databases' || hub?.kind === 'database') &&
              !showSettings &&
              !reviewScope
            }
            searchOpen={
              !!search && !search.savedId && !showSettings && !reviewScope
            }
            onOpenSearch={() => setSearchPopup(true)}
            savedSearchId={
              search && !showSettings && !reviewScope
                ? (search.savedId ?? null)
                : null
            }
            onOpenSavedSearch={(saved) =>
              openSearch(readSavedQuery(saved.query), saved.id)
            }
            onReviewSavedSearch={(saved) => runTask(reviewSavedSearch(saved))}
            onOpenTag={openTag}
            onNotesRewritten={(pageIds) => {
              // The open page's editor still shows the old tags: reload it.
              if (currentPage && pageIds.includes(currentPage.id)) {
                setNotesVersion((v) => v + 1)
              }
            }}
          />
          <main className="flex-1 overflow-auto">
            {showSettings ? (
              <SettingsScreen
                key={settingsFocus ?? ''}
                db={db}
                focusId={settingsFocus ?? undefined}
              />
            ) : reviewScope ? (
              <ReviewScreen
                key={JSON.stringify(reviewScope)}
                db={db}
                scope={reviewScope}
                onScopeChange={setReviewScope}
                onOpenNote={(pageId, blockId) => {
                  openPage(pageId)
                  revealBlock(blockId)
                }}
                onClose={() => setReviewScope(null)}
              />
            ) : hub?.kind === 'cards' ? (
              <AllCardsScreen
                db={db}
                onOpenHit={(hit) => runTask(openHit(hit))}
                onReview={openReview}
                onClose={() => setHub(null)}
              />
            ) : hub?.kind === 'databases' ? (
              <DatabasesScreen
                db={db}
                workspaceId={workspace.id}
                onOpenDatabase={(id) => setHub({ kind: 'database', id })}
                onClose={() => setHub(null)}
              />
            ) : hub?.kind === 'database' ? (
              <DatabaseScreen
                key={hub.id}
                db={db}
                databaseId={hub.id}
                onOpenPage={openPage}
                onBack={() => setHub({ kind: 'databases' })}
              />
            ) : search ? (
              <SearchScreen
                key={search.key}
                db={db}
                initial={search.query}
                title={savedSearch?.name}
                actions={(query) => (
                  <SaveSearchActions
                    db={db}
                    query={query}
                    saved={savedSearch}
                    onSaved={(saved) =>
                      setSearch((s) => s && { ...s, savedId: saved.id })
                    }
                  />
                )}
                onOpenHit={(hit) => runTask(openHit(hit))}
                onReview={(blockIds, name) =>
                  openReview({ kind: 'blocks', blockIds, name })
                }
                onClose={() => setSearch(null)}
              />
            ) : openNotebookRecord ? (
              <NotebookScreen
                key={openNotebookRecord.id}
                db={db}
                notebook={openNotebookRecord}
                onOpenPage={openPage}
                onCreatePage={(id) => runTask(createPageIn(id, null))}
                onOpenHit={(hit) => runTask(openHit(hit))}
                onReview={openReview}
                onClose={() => setNotebookId(null)}
              />
            ) : currentPage ? (
              <PageView
                key={`${currentPage.id}:${notesVersion}`}
                db={db}
                page={currentPage}
                autoFocusTitle={focusTitlePageId === currentPage.id}
                onOpenPage={openPage}
                onOpenNewPage={openNewPage}
                onReview={(includeSubpages) =>
                  openReview({
                    kind: 'page',
                    pageId: currentPage.id,
                    includeSubpages,
                  })
                }
                onNewPageFromTemplate={(id) => runTask(newPageFromTemplate(id))}
                onOpenTag={openTag}
                onOpenDatabase={(id) => {
                  openPage(null)
                  setHub({ kind: 'database', id })
                }}
              />
            ) : notebooks.length === 0 && currentPage === null ? (
              <div className="mt-[30vh] text-center">
                <p className="mb-5 text-muted">
                  Create a notebook to begin, or open today’s journal.
                </p>
                <button
                  type="button"
                  onClick={() => runTask(createNotebookAndOpen())}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Create notebook
                </button>
              </div>
            ) : currentPage === null ? (
              <p className="mt-[30vh] text-center text-muted">
                Select a page in the sidebar, or press Alt+N for a new one.
              </p>
            ) : null}
          </main>
        </div>

        {picker && (
          <TemplatePicker
            db={db}
            workspaceId={workspace.id}
            mode={picker.mode}
            onDone={(result) => {
              setPicker(null)
              picker.resolve(result)
            }}
          />
        )}
        {searchPopup && (
          <SearchPopup
            db={db}
            onClose={() => setSearchPopup(false)}
            onOpenHit={(hit) => {
              setSearchPopup(false)
              runTask(openHit(hit))
            }}
            onOpenPage={(id) => {
              setSearchPopup(false)
              openPage(id)
            }}
            onSeeAll={openSearch}
          />
        )}
        {choice && (
          <ChoiceDialog
            request={choice.request}
            onDone={(value) => {
              setChoice(null)
              choice.resolve(value)
            }}
            onOpenSetting={openSettings}
          />
        )}
        {toastMessage && (
          <Toast message={toastMessage.message} action={toastMessage.action} />
        )}
      </AppUiContext>
    </ThemeContext>
  )
}

export default App
