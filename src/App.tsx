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
import { useTreeState } from './app/useTreeState'
import { db } from './core/db'
import type { Page, Workspace } from './core/types'
import { getOrCreateDefaultWorkspace } from './core/workspaceService'
import { ensureSearchIndex } from './search/searchService'
import { openJournalDay } from './journal/journalService'
import { Sidebar } from './notebooks/Sidebar'
import { createNotebook, listNotebooks } from './notebooks/notebookService'
import { PageView } from './pages/PageView'
import { createPage, getPage } from './pages/pageService'
import { ReviewScreen } from './recall/ReviewScreen'
import type { ReviewScope } from './recall/reviewService'
import { theme as themeSetting } from './settings/builtinSettings'
import { SettingsScreen } from './settings/SettingsScreen'
import { useDeviceSetting } from './settings/useSetting'
import { TemplatePicker } from './templates/TemplatePicker'
import { revealBlock } from './editor/revealBlock'
import { AllCardsScreen } from './recall/AllCardsScreen'
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
  // Settings replaces the open page in the main area until a page is opened.
  const [showSettings, setShowSettings] = useState(false)
  // Setting to scroll to and highlight when Settings opens (e.g. from a dialog).
  const [settingsFocus, setSettingsFocus] = useState<string | null>(null)
  const openSettings = (settingId?: string) => {
    setReviewScope(null)
    setShowCards(false)
    setSettingsFocus(settingId ?? null)
    setShowSettings(true)
  }
  // Review replaces the open page the same way (null = not reviewing).
  const [reviewScope, setReviewScope] = useState<ReviewScope | null>(null)
  // The All cards hub replaces the open page the same way.
  const [showCards, setShowCards] = useState(false)
  const openPage = (id: string | null) => {
    setShowSettings(false)
    setReviewScope(null)
    setShowCards(false)
    setCurrentPageId(id)
  }
  const openReview = (scope: ReviewScope) => {
    setShowSettings(false)
    setShowCards(false)
    setReviewScope(scope)
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
    return () => window.removeEventListener('keydown', listener)
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
            cardsOpen={showCards && !showSettings && !reviewScope}
            onOpenCards={() => {
              setShowSettings(false)
              setReviewScope(null)
              setShowCards(true)
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
            ) : showCards ? (
              <AllCardsScreen
                db={db}
                onOpenNote={(pageId, blockId) => {
                  openPage(pageId)
                  revealBlock(blockId)
                }}
              />
            ) : currentPage ? (
              <PageView
                key={currentPage.id}
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
