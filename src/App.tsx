import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { runTask } from './app/errors'
import { THEME_PREF_KEY, applyTheme, isTheme } from './app/theme'
import { ThemeContext } from './app/themeContext'
import { isStringOrNull } from './app/uiPrefs'
import { usePref } from './app/usePref'
import { useTreeState } from './app/useTreeState'
import { db } from './core/db'
import type { Page, Workspace } from './core/types'
import { getOrCreateDefaultWorkspace } from './core/workspaceService'
import { Sidebar } from './notebooks/Sidebar'
import { createNotebook, listNotebooks } from './notebooks/notebookService'
import { PageView } from './pages/PageView'
import { createPage, getPage } from './pages/pageService'

// Cached so React StrictMode's double effect cannot create two workspaces.
let workspacePromise: Promise<Workspace> | undefined

/** App shell: sidebar + open page. Keyboard: Alt+N, Alt+Shift+N (README). */
function App() {
  const [workspace, setWorkspace] = useState<Workspace>()
  const [currentPageId, setCurrentPageId] = usePref(
    'currentPage',
    isStringOrNull,
    null,
  )
  const [renamingNotebookId, setRenamingNotebookId] = useState<string | null>(
    null,
  )
  const tree = useTreeState()
  const [theme, setTheme] = usePref(THEME_PREF_KEY, isTheme, 'day')
  useEffect(() => applyTheme(theme), [theme])

  useEffect(() => {
    workspacePromise ??= getOrCreateDefaultWorkspace(db)
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

  // A newly created page whose title should get the cursor.
  const [focusTitlePageId, setFocusTitlePageId] = useState<string | null>(null)

  /** Shows a just-created page: reveal it in the sidebar and open it. */
  const openNewPage = (page: Page, focusTitle = true) => {
    tree.expandNotebook(page.notebookId)
    if (page.parentId) tree.expandPage(page.parentId)
    setFocusTitlePageId(focusTitle ? page.id : null)
    setCurrentPageId(page.id)
  }

  const createPageIn = async (
    notebookId: string,
    parentId: string | null,
    focusTitle = true,
  ) => {
    openNewPage(await createPage(db, notebookId, parentId), focusTitle)
  }

  const createNotebookAndOpen = async () => {
    if (!workspace) return
    const notebook = await createNotebook(db, workspace.id, 'New notebook')
    setRenamingNotebookId(notebook.id)
    // The notebook name field keeps the cursor, not the page title.
    await createPageIn(notebook.id, null, false)
  }

  // Keyboard shortcuts (handler kept in a ref so it always sees fresh state).
  const onShortcut = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    onShortcut.current = (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.code !== 'KeyN') return
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
          onOpenPage={setCurrentPageId}
          onCreateNotebook={() => runTask(createNotebookAndOpen())}
          onCreatePage={(notebookId, parentId) =>
            runTask(createPageIn(notebookId, parentId))
          }
        />
        <main className="flex-1 overflow-auto">
          {notebooks.length === 0 ? (
            <div className="mt-[30vh] text-center">
              <p className="mb-5 text-muted">Create a notebook to begin.</p>
              <button
                type="button"
                onClick={() => runTask(createNotebookAndOpen())}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Create notebook
              </button>
            </div>
          ) : currentPage ? (
            <PageView
              key={currentPage.id}
              db={db}
              page={currentPage}
              autoFocusTitle={focusTitlePageId === currentPage.id}
              onOpenPage={setCurrentPageId}
              onOpenNewPage={openNewPage}
            />
          ) : currentPage === null ? (
            <p className="mt-[30vh] text-center text-muted">
              Select a page in the sidebar, or press Alt+N for a new one.
            </p>
          ) : null}
        </main>
      </div>
    </ThemeContext>
  )
}

export default App
