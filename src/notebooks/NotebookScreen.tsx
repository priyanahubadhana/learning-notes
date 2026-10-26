import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { runTask } from '../app/errors'
import { MenuPopover, NameDialog, type MenuItem } from '../app/ui'
import { isStringOrNull } from '../app/uiPrefs'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import type { Notebook, NotebookTab } from '../core/types'
import { ensureStudyTracker } from '../databases/databaseService'
import { studyTrackerId, tabName } from '../databases/notebookTabs'
import { DatabaseView } from '../databases/views/DatabaseView'
import { t } from '../i18n/t'
import { listNotePages } from '../pages/pageService'
import { CardsTab } from '../recall/CardsTab'
import type { ReviewScope } from '../recall/reviewService'
import type { SearchHit } from '../search/searchQuery'
import { updateNotebookTab } from './notebookService'

interface NotebookScreenProps {
  db: LearningNotesDB
  notebook: Notebook
  onOpenPage: (pageId: string) => void
  onCreatePage: (notebookId: string) => void
  onOpenHit: (hit: SearchHit) => void
  onReview: (scope: ReviewScope) => void
  /** Leaves the screen (its close button shows on phones, full screen). */
  onClose: () => void
}

/**
 * A notebook opened from the sidebar: its name and tabs (Notes · Database ·
 * Cards). The open tab is remembered per notebook on this device.
 */
export function NotebookScreen({
  db,
  notebook,
  onOpenPage,
  onCreatePage,
  onOpenHit,
  onReview,
  onClose,
}: NotebookScreenProps) {
  const tabs = (notebook.tabs ?? []).filter((tab) => !tab.hidden)
  const hiddenTabs = (notebook.tabs ?? []).filter((tab) => tab.hidden)
  const [tabId, setTabId] = usePref(
    `notebookTab:${notebook.id}`,
    isStringOrNull,
    null,
  )
  const active = tabs.find((tab) => tab.id === tabId) ?? tabs[0]
  const [menu, setMenu] = useState<DOMRect | null>(null)
  const [renaming, setRenaming] = useState<NotebookTab | null>(null)
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())
  const baseId = useId()

  // Arrow keys move between tabs (ARIA tabs pattern), mirrored in RTL.
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === active?.id)
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    let next: number
    if (step) next = (index + (rtl ? -step : step) + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    else return
    e.preventDefault()
    setTabId(tabs[next].id)
    tabRefs.current.get(tabs[next].id)?.focus()
  }

  const menuItems: MenuItem[] = [
    ...(active
      ? [
          {
            label: t('notebook.renameTab', { name: tabName(active) }),
            icon: '✎',
            onSelect: () => setRenaming(active),
          },
        ]
      : []),
    ...(active && tabs.length > 1
      ? [
          {
            label: t('notebook.hideTab', { name: tabName(active) }),
            icon: '◌',
            onSelect: () =>
              runTask(
                updateNotebookTab(db, notebook.id, active.id, { hidden: true }),
              ),
          },
        ]
      : []),
    ...hiddenTabs.map((tab) => ({
      label: t('notebook.showTab', { name: tabName(tab) }),
      icon: '◉',
      onSelect: () => {
        setTabId(tab.id)
        runTask(updateNotebookTab(db, notebook.id, tab.id, { hidden: false }))
      },
    })),
  ]

  return (
    // Full screen on phones, like Search (the sidebar takes the width).
    <div className="phone:fixed phone:inset-0 phone:z-30 phone:overflow-auto phone:bg-bg">
      <div className="mx-auto max-w-[1040px] px-4 pt-8 pb-24 phone:pt-3 md:px-12 md:pt-12">
        <div className="mb-1 text-xs text-muted">{t('notebook.crumb')}</div>
        <div className="mb-4 flex items-start gap-2">
          <h1 className="flex-1 text-[26px] leading-tight font-bold tracking-[-0.02em]">
            {notebook.title || t('review.untitled')}
          </h1>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('notebook.close')}
            title={t('notebook.close')}
            className="hidden size-11 items-center justify-center rounded-lg text-lg text-muted hover:bg-hover hover:text-ink phone:flex"
          >
            ×
          </button>
        </div>
        <div className="mb-5 flex items-end border-b border-line">
          <div
            role="tablist"
            aria-label={t('notebook.tabs')}
            onKeyDown={onTabKey}
            className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto"
          >
            {tabs.map((tab) => {
              const selected = tab.id === active?.id
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    if (el) tabRefs.current.set(tab.id, el)
                    else tabRefs.current.delete(tab.id)
                  }}
                  id={`${baseId}-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setTabId(tab.id)}
                  className={`-mb-px min-h-10 border-b-2 px-3 text-sm whitespace-nowrap ${
                    selected
                      ? 'border-ink font-semibold text-ink'
                      : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  {tabName(tab)}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            aria-label={t('notebook.tabOptions')}
            title={t('notebook.tabOptions')}
            aria-haspopup="menu"
            aria-expanded={!!menu}
            onClick={(e) => setMenu(e.currentTarget.getBoundingClientRect())}
            className="min-h-10 min-w-10 rounded-md text-muted hover:bg-hover hover:text-ink"
          >
            ⋯
          </button>
        </div>
        <div
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={active && `${baseId}-tab-${active.id}`}
        >
          {active?.kind === 'notes' && (
            <NotesTab
              db={db}
              notebookId={notebook.id}
              onOpenPage={onOpenPage}
              onCreatePage={() => onCreatePage(notebook.id)}
            />
          )}
          {active?.kind === 'database' && active.databaseId && (
            <DatabaseTab
              db={db}
              notebookId={notebook.id}
              databaseId={active.databaseId}
              onOpenPage={onOpenPage}
            />
          )}
          {active?.kind === 'cards' && (
            <CardsTab
              db={db}
              notebookId={notebook.id}
              onOpenHit={onOpenHit}
              onReview={onReview}
            />
          )}
        </div>

        {menu && (
          <MenuPopover
            anchor={menu}
            onClose={() => setMenu(null)}
            items={menuItems}
          />
        )}
        {renaming && (
          <NameDialog
            title={t('notebook.renameTabTitle')}
            label={t('notebook.renameTabHint')}
            initialValue={tabName(renaming)}
            confirmLabel={t('dialog.save')}
            onCancel={() => setRenaming(null)}
            onConfirm={(title) => {
              setRenaming(null)
              runTask(
                updateNotebookTab(db, notebook.id, renaming.id, { title }),
              )
            }}
          />
        )}
      </div>
    </div>
  )
}

/** Notes tab: the notebook's top-level pages (sub-pages in the sidebar). */
function NotesTab({
  db,
  notebookId,
  onOpenPage,
  onCreatePage,
}: {
  db: LearningNotesDB
  notebookId: string
  onOpenPage: (pageId: string) => void
  onCreatePage: () => void
}) {
  const pages = useLiveQuery(
    () => listNotePages(db, notebookId),
    [db, notebookId],
  )
  if (!pages)
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  const subPages = new Map<string, number>()
  for (const page of pages) {
    if (page.parentId) {
      subPages.set(page.parentId, (subPages.get(page.parentId) ?? 0) + 1)
    }
  }
  const top = pages.filter((p) => p.parentId === null)
  return (
    <section aria-label={t('notebook.tab.notes')}>
      {top.length === 0 ? (
        <p className="mb-3 text-sm text-muted">{t('notebook.noPages')}</p>
      ) : (
        <ul className="mb-3 rounded-[10px] border border-line p-1">
          {top.map((page) => (
            <li key={page.id} className="border-b border-line last:border-0">
              <button
                type="button"
                onClick={() => onOpenPage(page.id)}
                className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-start text-sm hover:bg-hover"
              >
                <span aria-hidden>📄</span>
                <span className="min-w-0 flex-1 truncate">
                  {page.title || t('review.untitled')}
                </span>
                {!!subPages.get(page.id) && (
                  <span className="shrink-0 text-xs text-muted">
                    {t('notebook.subPages', { count: subPages.get(page.id)! })}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onCreatePage}
        className="min-h-9 rounded-lg border border-line px-3 text-[13px] hover:border-accent hover:text-accent"
      >
        {t('notebook.newPage')}
      </button>
    </section>
  )
}

/**
 * Database tab. The Study tracker is made the first time its tab opens
 * (its id comes from the notebook, so the tab already points to it).
 */
function DatabaseTab({
  db,
  notebookId,
  databaseId,
  onOpenPage,
}: {
  db: LearningNotesDB
  notebookId: string
  databaseId: string
  onOpenPage: (pageId: string) => void
}) {
  const isTracker = databaseId === studyTrackerId(notebookId)
  const [ready, setReady] = useState(!isTracker)
  useEffect(() => {
    if (!isTracker) return
    let live = true
    ensureStudyTracker(db, notebookId).then(
      () => live && setReady(true),
      (error: unknown) => console.error('Could not make the tracker', error),
    )
    return () => {
      live = false
    }
  }, [db, notebookId, isTracker])
  if (!ready)
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  return (
    <DatabaseView db={db} databaseId={databaseId} onOpenPage={onOpenPage} />
  )
}
