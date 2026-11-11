import { displayName, sampleName } from '../i18n/defaultNames'
import { Tip } from '../help/Help'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  lazy,
  Suspense,
  useEffect,
  useContext,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { SummaryView } from '../app/summary/SummaryView'
import { ensureSummaryTab } from '../core/summaryService'
import { pauseMenuItem } from '../app/pauseMenu'
import { MenuPopover, NameDialog, type MenuItem } from '../app/ui'
import { isStringOrNull } from '../app/uiPrefs'
import { pushRouteParts, useRouteParts } from '../app/router'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import type { Notebook, NotebookTab } from '../core/types'
import { isLive } from '../core/records'
import { pageTitle } from '../app/pageTitle'
import { scopedDatabaseIds } from '../pages/tabs/databaseScope'
import { ensureStudyTracker } from '../databases/databaseService'
import { studyTrackerId, tabName } from '../databases/notebookTabs'
import { DatabaseView } from '../databases/views/DatabaseView'
import { t } from '../i18n/t'
import { pageAddressItem } from '../pages/pageAddressMenu'
import { editLockItem } from '../app/lock/editLockMenu'
import { useLockItem } from '../app/lock/lockMenu'
import { CardsTab } from '../recall/CardsTab'
import { ReviseTab } from '../revise/ReviseTab'
import type { ReviewScope } from '../recall/reviewService'
import type { SearchHit } from '../search/searchQuery'
import { setNotebookPathStyle, updateNotebookTab } from './notebookService'
import { NotesTab } from './NotesViews'
import { downloadFile } from '../app/download'
import {
  exportLayerFile,
  layerFileName,
  shareManifest,
} from '../layers/layerService'

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

const ExportDialog = lazy(() =>
  import('../share/export/ExportDialog').then((m) => ({
    default: m.ExportDialog,
  })),
)

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
  // The address holds the open tab, so Back/Forward and refresh keep it.
  const routeTab = useRouteParts(0)
  const active = tabs.find((tab) => tab.id === (routeTab ?? tabId)) ?? tabs[0]
  const openTab = (id: string) => {
    setTabId(id)
    pushRouteParts(0, id, active ? [active.id] : [])
  }
  const { toast } = useContext(AppUiContext)
  const lockItem = useLockItem(db, 'notebook', notebook.id, !!notebook.locked)
  const [menu, setMenu] = useState<DOMRect | null>(null)
  const [renaming, setRenaming] = useState<NotebookTab | null>(null)
  const [exporting, setExporting] = useState(false)
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())
  const baseId = useId()
  // Notebooks made before the Summary tab (Phase M) get it once, when opened.
  useEffect(() => {
    if (notebook.tabs && !notebook.tabs.some((tab) => tab.kind === 'summary')) {
      runTask(ensureSummaryTab(db, notebook))
    }
  }, [db, notebook])

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
    openTab(tabs[next].id)
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
    {
      label: t('export.notebook'),
      icon: '⤒',
      onSelect: () => setExporting(true),
    },
    pauseMenuItem(
      db,
      'notebook',
      notebook.id,
      notebook.title,
      !!notebook.paused,
      toast,
    ),
    ...lockItem,
    editLockItem(db, 'notebook', notebook.id, !!notebook.editLocked, toast),
    // I2: this notebook as a file a friend opens with Layer gallery › Add.
    {
      label: t('layers.share'),
      icon: '◫',
      onSelect: () =>
        runTask(
          (async () => {
            const manifest = shareManifest(notebook)
            downloadFile(
              layerFileName(manifest),
              await exportLayerFile(db, notebook.id, manifest),
            )
            toast(t('layers.shared'))
          })(),
        ),
    },
    // Page address for every page of this notebook (a page can still override it).
    pageAddressItem(notebook.pathStyle, (style) =>
      runTask(setNotebookPathStyle(db, notebook.id, style)),
    ),
    ...hiddenTabs.map((tab) => ({
      label: t('notebook.showTab', { name: tabName(tab) }),
      icon: '◉',
      onSelect: () => {
        openTab(tab.id)
        runTask(updateNotebookTab(db, notebook.id, tab.id, { hidden: false }))
      },
    })),
  ]

  return (
    // Full screen on phones, like Search (the sidebar takes the width).
    <div>
      <div className="mx-auto max-w-[1040px] px-4 pt-8 pb-24 md:px-12 md:pt-12">
        <div className="mb-1 text-xs text-muted">{t('notebook.crumb')}</div>
        <div className="mb-4 flex items-start gap-2">
          <h1 className="flex-1 text-[26px] leading-tight font-bold tracking-[-0.02em]">
            {displayName(sampleName(notebook)) || t('review.untitled')}
          </h1>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('notebook.close')}
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
            className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto overflow-y-hidden"
          >
            {tabs.map((tab) => {
              const selected = tab.id === active?.id
              return (
                <TabTip key={tab.id} kind={tab.kind}>
                  <button
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
                    onClick={() => openTab(tab.id)}
                    className={`-mb-px min-h-10 border-b-2 px-3 text-sm whitespace-nowrap ${
                      selected
                        ? 'border-ink font-semibold text-ink'
                        : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    {tabName(tab)}
                  </button>
                </TabTip>
              )
            })}
          </div>
          <Tip id="notebook.tabOptions" touchInfo={false}>
            <button
              type="button"
              aria-label={t('notebook.tabOptions')}
              aria-haspopup="menu"
              aria-expanded={!!menu}
              onClick={(e) => setMenu(e.currentTarget.getBoundingClientRect())}
              className="min-h-10 min-w-10 rounded-md text-muted hover:bg-hover hover:text-ink"
            >
              ⋯
            </button>
          </Tip>
        </div>
        <div
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={active && `${baseId}-tab-${active.id}`}
        >
          {active?.kind === 'notes' && (
            <NotesTab
              db={db}
              notebook={notebook}
              tabId={active.id}
              onOpenPage={onOpenPage}
              onCreatePage={() => onCreatePage(notebook.id)}
            />
          )}
          {active?.kind === 'summary' && (
            <SummaryView
              db={db}
              scope={{ kind: 'notebook', notebookId: notebook.id }}
              onOpenPage={onOpenPage}
            />
          )}
          {active?.kind === 'database' && active.databaseId && (
            <DatabaseTab
              db={db}
              notebookId={notebook.id}
              databaseId={active.databaseId}
              tabId={active.id}
              onOpenPage={onOpenPage}
            />
          )}
          {active?.kind === 'revise' && (
            <ReviseTab
              db={db}
              notebookId={notebook.id}
              tabId={active.id}
              onOpenPage={onOpenPage}
              onReview={onReview}
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
        {exporting && (
          <Suspense fallback={null}>
            <ExportDialog
              db={db}
              target={{ kind: 'notebook', notebookId: notebook.id }}
              title={displayName(sampleName(notebook)) || t('review.untitled')}
              onClose={() => setExporting(false)}
            />
          </Suspense>
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

/**
 * Database tab. The Study tracker is made the first time its tab opens
 * (its id comes from the notebook, so the tab already points to it).
 */
function DatabaseTab({
  db,
  notebookId,
  databaseId,
  tabId,
  onOpenPage,
}: {
  db: LearningNotesDB
  notebookId: string
  databaseId: string
  /** This tab's id, the first level of the address. */
  tabId: string
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
  // Every database that belongs to this notebook, the Study tracker first.
  const databases = useLiveQuery(async () => {
    const own = (
      await db.databases.where('notebookId').equals(notebookId).toArray()
    )
      .filter((d) => d.deletedAt === null)
      .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
    return [
      ...own.filter((d) => d.kind === 'studyTracker'),
      ...own.filter((d) => d.kind !== 'studyTracker'),
    ]
  }, [db, notebookId])
  // Filter by page: only the databases placed on that page or under it.
  const [pageFilter, setPageFilter] = useState('')
  const pages = useLiveQuery(
    async () =>
      (await db.pages.where('notebookId').equals(notebookId).toArray())
        .filter(isLive)
        .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0)),
    [db, notebookId],
  )
  const onPage = useLiveQuery(
    async () =>
      pageFilter
        ? new Set(
            await scopedDatabaseIds(
              db,
              '',
              { id: pageFilter, notebookId },
              'sub',
            ),
          )
        : null,
    [db, notebookId, pageFilter],
  )
  // The chosen database is the second level of the address (the view the third).
  const pickedId = useRouteParts(1)
  if (!ready || !databases || pages === undefined) {
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  }
  // A page that is gone no longer filters.
  const filterOn = !!pageFilter && pages.some((p) => p.id === pageFilter)
  const filtering = filterOn && !!onPage
  const listed = filtering
    ? databases.filter((d) => onPage.has(d.id))
    : databases
  const shownId = listed.some((d) => d.id === pickedId)
    ? pickedId!
    : listed.some((d) => d.id === databaseId)
      ? databaseId
      : (listed[0]?.id ?? databaseId)
  return (
    <div>
      {pages.length > 0 && (
        <label className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-muted">
          {t('notebook.dbPageFilter')}
          <select
            value={filterOn ? pageFilter : ''}
            data-db-page-filter
            onChange={(e) => setPageFilter(e.target.value)}
            className="min-h-9 any-pointer-coarse:min-h-11 max-w-full rounded-lg border border-line bg-bg px-2 text-[13px] text-ink"
          >
            <option value="">{t('notebook.dbAllPages')}</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {pageTitle(p)}
              </option>
            ))}
          </select>
        </label>
      )}
      {filtering && listed.length === 0 && (
        <p className="text-sm text-muted" data-db-page-empty>
          {t('notebook.dbPageEmpty')}
        </p>
      )}
      {listed.length > 1 && (
        <Tip
          id="notebook.databasePicker"
          className="mb-3 block"
          touchInfo={false}
        >
          <div
            role="group"
            aria-label={t('notebook.databases')}
            className="flex flex-wrap gap-1.5"
          >
            {listed.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={d.id === shownId}
                onClick={() => pushRouteParts(1, d.id, [tabId, shownId])}
                className="min-h-8 rounded-full border border-line px-3 text-[13px] hover:bg-hover aria-pressed:border-accent aria-pressed:bg-soft"
              >
                {d.title}
              </button>
            ))}
          </div>
        </Tip>
      )}
      {(!filtering || listed.length > 0) && (
        <DatabaseView
          key={shownId}
          db={db}
          databaseId={shownId}
          onOpenPage={onOpenPage}
          routeIndex={2}
          routePrefix={[tabId, shownId]}
        />
      )}
    </div>
  )
}

const TAB_TIPS = {
  notes: 'notebook.tabNotes',
  database: 'notebook.tabDatabase',
  cards: 'notebook.tabCards',
  revise: 'notebook.tabRevise',
  summary: 'notebook.tabSummary',
} as const

/** A tab with the tip that explains it (own kinds of tab have none). */
function TabTip({ kind, children }: { kind: string; children: ReactNode }) {
  const id = TAB_TIPS[kind as keyof typeof TAB_TIPS]
  return id ? (
    <Tip id={id} touchInfo={false}>
      {children}
    </Tip>
  ) : (
    <>{children}</>
  )
}
