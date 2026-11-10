import { useLiveQuery } from 'dexie-react-hooks'
import {
  lazy,
  Suspense,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { AppUiContext, TopBarSlotContext } from '../app/appUi'
import { altShortcutLabel } from '../app/keys'
import { runTask } from '../app/errors'
import { PageReview, Segments, type PageTab } from '../app/summary/PageTabs'
import {
  EXTRA_TABS,
  isExtraTab,
  notebookPageTabs,
  setNotebookPageTab,
} from '../notebooks/pageTabs'
import { SummaryView } from '../app/summary/SummaryView'
import { MenuPopover, NameDialog, type MenuItem } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { pageMode } from '../editor/editPolicy'
import { PageEditor } from '../editor/PageEditor'
import { PaperFrame } from '../paper/PaperFrame'
import { usePaperBoxes } from '../paper/usePaperBoxes'
import type { EditorApi } from '../editor/editorContext'
import { revealBlock } from '../editor/revealBlock'
import { HistoryDialog } from '../history/HistoryDialog'
import { recordVersion } from '../history/versionService'
import { dateKey } from '../journal/dates'
import { t } from '../i18n/t'
import { getNotebook } from '../notebooks/notebookService'
import { isPageBlank, saveAsTemplate } from '../templates/templateService'
import { hintPageOk } from '../paper/hintPages'
import { PAPER_STYLES, paperStyleKey } from './paperStyles'
import { makeDatabasePage } from '../databases/databasePage'
import { NewPageStart } from '../templates/NewPageStart'
import {
  getPagePath,
  setPageInkBg,
  setPagePathStyle,
  setPageSheet,
} from './pageService'
import { PagePath } from './PagePath'
import { trashPageWithUndo } from './pageTrash'

import { resolvePathStyle } from './pathStyle'
import { pageAddressItem } from './pageAddressMenu'
import { pauseMenuItem } from '../app/pauseMenu'
import { deviceModeItem } from '../app/deviceModeItems'
import { LinkedFrom } from '../links/LinkedFrom'
import { PageTags } from '../tags/PageTags'
import { getDatabase } from '../databases/databaseService'
import { RowProperties } from '../databases/RowProperties'
import { createTitleSaver } from './titleSaver'
import { isApple } from '../app/keys'
import {
  barPlacementSetting,
  deviceModeSetting,
} from '../settings/builtinSettings'
import { toggleToolBar } from '../app/tools/toolbarVisibility'
import { favourites, toggleFavourite } from '../app/favourites'
import { getAppActions } from '../app/tools/toolRuntime'
import { shortcutShiftLabel } from '../app/keys'
import { useDeviceSetting } from '../settings/useSetting'
import { pathStyleSetting } from '../settings/builtinSettings'
import { editLockItem } from '../app/lock/editLockMenu'
import { useLockItem } from '../app/lock/lockMenu'
import { editLockSource, setEditLocked } from '../core/editLock'
import { ReadingFrame } from '../app/reading/ReadingFrame'
import { MARGIN_PX, WIDTH_PX } from '../app/reading/readingPrefs'
import { setReadFirst } from '../app/reading/readFirst'
import {
  readingAuto,
  readingView,
  startReading,
  stopReading,
} from '../app/reading/readingState'
import {
  surfaceStyle,
  useReadingSettings,
} from '../app/reading/useReadingSettings'
import { readingEntrySetting } from '../settings/readingSettings'
import { openReader } from '../app/reading/readingTools'
import { Glyph, Icon } from '../app/tools/icons'
import { setPageReloader } from '../core/historySteps'

const PromptsDialog = lazy(() => import('../prompts/PromptsDialog'))

const MindMapTab = lazy(() => import('./tabs/MindMapTab'))
const SlidesTab = lazy(() => import('./tabs/SlidesTab'))
const AudioTab = lazy(() => import('./tabs/AudioTab'))
const DatabaseTab = lazy(() => import('./tabs/DatabaseTab'))
const ExportDialog = lazy(() =>
  import('../share/export/ExportDialog').then((m) => ({
    default: m.ExportDialog,
  })),
)

interface PageViewProps {
  db: LearningNotesDB
  page: Page
  /** Put the cursor in the title (for newly created pages). */
  autoFocusTitle: boolean
  /** Show the template chooser though the title is not focused (first page of a new notebook). */
  offerStart?: boolean
  onOpenPage: (pageId: string | null) => void
  /** Opens a page just created from inside this page. */
  onOpenNewPage: (page: Page) => void
  /** "New page from this template" (template pages only). */
  onNewPageFromTemplate: (templateId: string) => void
  /** Opens the Review screen for this page's cards (and sub-pages'). */
  onReview: (includeSubpages?: boolean) => void
  /** Shows everything with a tag (Search). */
  onOpenTag?: (tagId: string) => void
  /** Opens a database on its own screen. */
  onOpenDatabase?: (databaseId: string) => void
  /** Opens an attached file in the reader (a file block's "Open"). */
  onOpenAttachment?: (fileId: string) => void
  /** Reloads the editor after the page was changed from outside it. */
  onReload: () => void
  /** Opens Save & restore, to restore a backup. */
  onOpenBackup: () => void
  /** Shown under the title (the Library's header of a book or source page). */
  header?: React.ReactNode
}

/** An open page: breadcrumb, action bar, banner, title and block editor. */
export function PageView({
  db,
  page,
  autoFocusTitle,
  offerStart,
  onOpenPage,
  onOpenNewPage,
  onNewPageFromTemplate,
  onReview,
  onOpenTag,
  onOpenDatabase,
  onOpenAttachment,
  onReload,
  onOpenBackup,
  header,
}: PageViewProps) {
  const { toast } = useContext(AppUiContext)
  // Undo of a restored version redraws the page from the database.
  useEffect(() => setPageReloader(onReload), [onReload])
  const path = useLiveQuery(() => getPagePath(db, page.id), [db, page.id]) ?? []
  const notebook = useLiveQuery(
    () => getNotebook(db, page.notebookId),
    [db, page.notebookId],
  )
  // A row of a database is named after its database, not the hidden notebook.
  const rowDatabase = useLiveQuery(
    async () =>
      page.databaseId ? await getDatabase(db, page.databaseId) : undefined,
    [db, page.databaseId],
  )
  const editor = useRef<EditorApi | null>(null)

  const isTemplate = notebook?.kind === 'templates'
  // Summary and Review views: normal pages only (not templates, not rows).
  const withTabs = !!notebook && !isTemplate && !page.databaseId
  const isToday = page.journalDate === dateKey(new Date())

  // History: earlier copies of this page.
  const [historyOpen, setHistoryOpen] = useState(false)
  const openHistory = () =>
    runTask(
      (async () => {
        await editor.current?.flush()
        await recordVersion(db, page.id, { force: true, reason: 'leave' }) // newest edits too
        setHistoryOpen(true)
      })(),
    )

  // Export (J1): a dialog with PDF, Word, Markdown and Text.
  const [exporting, setExporting] = useState(false)
  const hasSubpages = useLiveQuery(
    async () =>
      (await db.pages.where('parentId').equals(page.id).toArray()).some(
        (p) => p.deletedAt === null,
      ),
    [db, page.id],
  )
  const openExport = () =>
    runTask(
      (async () => {
        await editor.current?.flush()
        setExporting(true)
      })(),
    )

  // "Save as template" asks for a name first.
  const [naming, setNaming] = useState(false)
  // Notes · Summary · Review (Phase M); every page opens on its notes.
  const [pageTabState, setPageTabState] = useState<{
    pageId: string
    tab: PageTab
  }>({ pageId: page.id, tab: 'notes' })
  const extraTabs = notebookPageTabs(notebook)
  const rawTab = pageTabState.pageId === page.id ? pageTabState.tab : 'notes'
  // A switched-off optional tab falls back to the notes.
  const pageTab: PageTab =
    isExtraTab(rawTab) && !extraTabs.includes(rawTab) ? 'notes' : rawTab
  const setPageTab = (tab: PageTab) => setPageTabState({ pageId: page.id, tab })
  const saveTemplate = () => setNaming(true)
  // The prompt library on this page (opened from the ⋯ menu; lazy).
  const [promptsOpen, setPromptsOpen] = useState(false)

  /** Saves a copy of this page (latest edits included) as a template. */
  const saveTemplateAs = (name: string) =>
    runTask(
      (async () => {
        setNaming(false)
        if (!notebook) return
        await editor.current?.flush()
        const template = await saveAsTemplate(
          db,
          notebook.workspaceId,
          page.id,
          name,
        )
        toast(
          t('page.savedTemplate', {
            name: template.title,
          }),
        )
      })(),
    )

  // The page's ⋯ menu in the top bar.
  const barSlot = useContext(TopBarSlotContext)
  const [moreAt, setMoreAt] = useState<DOMRect | null>(null)
  const [deviceMode] = useDeviceSetting(deviceModeSetting)
  const [barPlacement] = useDeviceSetting(barPlacementSetting)
  const [globalPathStyle] = useDeviceSetting(pathStyleSetting)
  const pathStyle = resolvePathStyle(
    page.pathStyle,
    notebook?.pathStyle,
    globalPathStyle,
  )
  const starred = favourites.useValue().includes(page.id)
  const lockItem = useLockItem(db, 'page', page.id, !!page.locked)
  // Edit lock (3c): this page's own flag or its notebook's.
  const editLockBy = editLockSource(page, notebook)
  const view = readingView.useValue()
  const reader = view === 'reader'
  const reading = useReadingSettings()
  const [entry] = useDeviceSetting(readingEntrySetting)
  const notebookLoaded = notebook !== undefined
  const readFirst = !!page.readFirst || !!notebook?.readFirst
  // A page or notebook set to always open in Reading mode turns it on; a page
  // that is not turns off what was turned on that way.
  useEffect(() => {
    if (!notebookLoaded) return
    if (readFirst) startReading(entry === 'reader' ? 'reader' : 'inPlace', true)
    else if (readingAuto.get()) stopReading()
    // Only when another page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id, notebookLoaded])
  // Polish 2 item 9: the paper's style and size.
  const paperItems: MenuItem[] = [
    {
      label: t('paper.style'),
      icon: '▦',
      onSelect: () => {},
      submenu: PAPER_STYLES.map((bg) => ({
        label: t(paperStyleKey(bg)),
        icon: '▦',
        checked: page.inkBg === bg,
        onSelect: () => runTask(setPageInkBg(db, page.id, bg)),
      })),
    },
    {
      label: t('paper.size'),
      icon: '▭',
      onSelect: () => {},
      submenu: (['A4', 'Letter'] as const).map((size) => ({
        label: t(size === 'A4' ? 'paper.sizeA4' : 'paper.sizeLetter'),
        icon: '▭',
        checked: (page.sheet ?? 'A4') === size,
        onSelect: () => runTask(setPageSheet(db, page.id, size)),
      })),
    },
  ]
  const moreItems: MenuItem[] = [
    // Page actions first.
    ...(notebook && !isTemplate
      ? [
          {
            label: t('page.reviewThis'),
            icon: '⟳',
            hint: altShortcutLabel('R'),
            onSelect: () => onReview(),
          },
        ]
      : []),
    ...(notebook && !isTemplate
      ? [
          {
            label: t('prompts.menu'),
            icon: '✦',
            onSelect: () => setPromptsOpen(true),
          },
        ]
      : []),
    { label: t('history.button'), icon: 'history', onSelect: openHistory },
    { label: t('tool.readerFull'), icon: 'bookOpen', onSelect: openReader },
    ...(isTemplate ? [] : paperItems),
    ...lockItem,
    ...(editLockBy === 'notebook'
      ? []
      : [editLockItem(db, 'page', page.id, !!page.editLocked, toast)]),
    {
      label: t(starred ? 'fav.remove' : 'fav.add'),
      icon: starred ? '★' : '☆',
      onSelect: () => {
        toggleFavourite(page.id)
        toast(t(starred ? 'fav.removed' : 'fav.added'))
      },
    },
    ...(notebook && !isTemplate
      ? [
          {
            label: t('page.saveTemplate'),
            icon: 'clipboard',
            onSelect: saveTemplate,
          },
        ]
      : []),
    ...(notebook && !isTemplate
      ? [pauseMenuItem(db, 'page', page.id, page.title, !!page.paused, toast)]
      : []),
    // The real import options (Notion, NotebookLM, files) live in Save & restore.
    {
      label: t('page.import'),
      icon: '⤓',
      onSelect: onOpenBackup,
    },
    {
      label: t('page.export'),
      icon: '⤒',
      onSelect: openExport,
    },
    {
      label: t('panel.open'),
      icon: 'search',
      hint: shortcutShiftLabel('K'),
      onSelect: () => getAppActions()?.openControlPanel(),
    },
    // Copy and paste, grouped.
    {
      label: t('copy.menu'),
      icon: '⧉',
      onSelect: () => {},
      submenu: [
        {
          label: t('copy.pictures'),
          icon: '⧉',
          onSelect: () => editor.current?.copyPage('pictures'),
        },
        {
          label: t('copy.pagePlain'),
          icon: '⧉',
          onSelect: () => editor.current?.copyPage('plain'),
        },
        {
          label: t('copy.pageMarkdown'),
          icon: '⧉',
          onSelect: () => editor.current?.copyPage('markdown'),
        },
        {
          label: t('paste.plain'),
          icon: '⎘',
          hint: isApple() ? '⌘⇧V' : 'Ctrl+Shift+V',
          onSelect: () => editor.current?.pastePlain(),
        },
      ],
    },
    // Page address for this page (wins over its notebook and Settings).
    pageAddressItem(page.pathStyle, (style) =>
      runTask(setPagePathStyle(db, page.id, style)),
    ),
    deviceModeItem(deviceMode),
    {
      label: t(barPlacement === 'floating' ? 'bar.show' : 'bar.hide'),
      icon: '☰',
      onSelect: () => toggleToolBar(),
    },
    // Red, just above Save & restore.
    {
      label: t('tree.deletePage'),
      icon: '×',
      danger: true,
      inPlace: true,
      onSelect: () =>
        runTask(
          trashPageWithUndo(db, page, toast, {
            onGone: () => onOpenPage(page.parentId),
            onBack: () => onOpenPage(page.id),
          }),
        ),
    },
    {
      label: t('page.restoreBackup'),
      icon: '⤓',
      onSelect: onOpenBackup,
    },
  ]

  const boxes = usePaperBoxes(
    db,
    page.id,
    !reader && !isTemplate && !editLockBy,
  )
  const hintPage = useMemo(() => hintPageOk(page.id), [page.id])
  const blankPage = useLiveQuery(() => isPageBlank(db, page.id), [db, page.id])
  /** The page editor of one box (unset = the default box, as before). */
  const editorOf = (boxId?: string) => (
    <PageEditor
      db={db}
      pageId={page.id}
      notebookId={page.notebookId}
      onOpenPage={onOpenPage}
      onOpenNewPage={onOpenNewPage}
      onOpenTag={onOpenTag}
      onOpenDatabase={onOpenDatabase}
      onOpenAttachment={onOpenAttachment}
      onReviewCards={notebook && !isTemplate ? onReview : undefined}
      onSaveAsTemplate={notebook && !isTemplate ? saveTemplate : undefined}
      editorRef={boxId ? undefined : editor}
      reading={view === 'off' ? undefined : { view }}
      boxId={boxId}
      autoFocus={boxId ? boxId === boxes.fresh : autoFocusTitle && !reader}
      key={boxId ?? 'main'}
    />
  )

  return (
    <div
      className="mx-auto max-w-[720px] px-14 pt-10 pb-[200px]"
      data-reading={view === 'inPlace' ? 'inPlace' : undefined}
      style={
        view === 'inPlace'
          ? {
              ...surfaceStyle(reading),
              maxWidth: WIDTH_PX[reading.width],
              paddingInline: MARGIN_PX[reading.margin],
            }
          : undefined
      }
    >
      {barSlot &&
        createPortal(
          <>
            <PagePath
              db={db}
              style={pathStyle}
              notebook={notebook}
              rowDatabase={rowDatabase}
              path={path}
              onOpenPage={onOpenPage}
              onOpenDatabase={onOpenDatabase}
            />
            <button
              type="button"
              aria-label={t('page.more')}
              aria-haspopup="menu"
              aria-expanded={!!moreAt}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) =>
                setMoreAt(
                  moreAt ? null : e.currentTarget.getBoundingClientRect(),
                )
              }
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-ink-soft hover:bg-hover hover:text-ink"
            >
              <span aria-hidden>⋯</span>
            </button>
            {moreAt && (
              <MenuPopover
                anchor={moreAt}
                items={moreItems}
                onClose={() => setMoreAt(null)}
              />
            )}
          </>,
          barSlot,
        )}

      <div style={{ display: reader ? 'none' : 'contents' }}>
        {isTemplate && (
          <Banner icon="clipboard">
            <span className="min-w-[160px] flex-1">
              <b className="font-semibold text-ink">
                {t('page.template.title')}
              </b>{' '}
              {t('page.template.text')}
            </span>
            <button
              type="button"
              onClick={() => onNewPageFromTemplate(page.id)}
              className="rounded-lg bg-accent px-3 py-1.5 text-[13px] text-white hover:opacity-90"
            >
              {t('page.template.new')}
            </button>
          </Banner>
        )}
        {isToday && (
          <Banner icon="sun">
            <span className="flex-1">
              <b className="font-semibold text-ink">{t('page.today.title')}</b>
              {t('page.today.text')}
            </span>
          </Banner>
        )}
      </div>
      {editLockBy && !reader && (
        <button
          type="button"
          data-testid="edit-lock-bar"
          onClick={() =>
            runTask(
              setEditLocked(
                db,
                editLockBy,
                editLockBy === 'page' ? page.id : page.notebookId,
                false,
              ).then(() => toast(t('editLock.unlocked'))),
            )
          }
          className="mb-3 flex min-h-11 w-full items-center gap-2 rounded-lg bg-soft px-3 py-2 text-left text-sm text-ink-soft hover:bg-hover"
        >
          <Icon name="lockKeyhole" size={14} aria-hidden />
          {t(editLockBy === 'page' ? 'editLock.bar' : 'editLock.barNotebook')}
        </button>
      )}
      <ReadingFrame
        db={db}
        pageId={page.id}
        pageTitle={page.title}
        view={view}
        flags={{ page: !!page.readFirst, notebook: !!notebook?.readFirst }}
        onReadFirst={(kind, on) =>
          runTask(
            setReadFirst(
              db,
              kind,
              kind === 'page' ? page.id : page.notebookId,
              on,
            ),
          )
        }
        onOpenPage={onOpenPage}
      >
        <TitleInput
          key={page.id}
          db={db}
          pageId={page.id}
          savedTitle={page.title}
          // Owner (8 Nov): a new page opens with the cursor in its top box;
          // a tap on the title still edits the title.
          autoFocus={false}
          readOnly={reader || !!editLockBy}
          onEnter={() => editor.current?.focus()}
        />
        {header}
        <div style={{ display: reader ? 'none' : 'contents' }}>
          <RowProperties db={db} page={page} />
          <PageTags
            db={db}
            pageId={page.id}
            tagIds={page.tagIds ?? []}
            onOpenTag={onOpenTag}
          />
          {withTabs && (
            <Segments
              tab={pageTab}
              onTab={setPageTab}
              className="mb-3"
              extras={extraTabs}
              allExtras={EXTRA_TABS}
              onToggleExtra={
                notebook
                  ? (tab, on) =>
                      runTask(setNotebookPageTab(db, notebook.id, tab, on))
                  : undefined
              }
            />
          )}
          {withTabs && pageTab === 'summary' && (
            <SummaryView
              db={db}
              scope={{ kind: 'page', pageId: page.id }}
              onOpenPage={onOpenPage}
              onOpenBlock={(pageId, blockId) => {
                if (pageId === page.id) setPageTab('notes')
                else onOpenPage(pageId)
                revealBlock(blockId)
              }}
            />
          )}
          {withTabs && pageTab === 'review' && (
            <>
              <RowProperties db={db} page={page} where="review" />
              <PageReview
                db={db}
                pageId={page.id}
                onReview={() => onReview(true)}
              />
            </>
          )}
          {withTabs && notebook && isExtraTab(pageTab) && (
            <Suspense fallback={null}>
              {pageTab === 'mindMap' && (
                <MindMapTab
                  db={db}
                  page={page}
                  editable={!editLockBy}
                  onEdited={onReload}
                />
              )}
              {pageTab === 'slides' && <SlidesTab db={db} pageId={page.id} />}
              {pageTab === 'audio' && <AudioTab db={db} pageId={page.id} />}
              {pageTab === 'database' && (
                <DatabaseTab
                  db={db}
                  page={page}
                  workspaceId={notebook.workspaceId}
                  onOpenPage={onOpenPage}
                />
              )}
            </Suspense>
          )}
        </div>
        {/* The editor stays open (only hidden) on the other views, so no typing is lost. */}
        <div
          style={{
            display: reader || pageTab === 'notes' ? 'contents' : 'none',
          }}
        >
          <PaperFrame
            page={page}
            flat={reader}
            renderBox={editorOf}
            eager={boxes.fresh}
            onAddBox={boxes.onAddBox}
            onAddBoxInOrder={boxes.onAddBoxInOrder}
            onGridChange={editLockBy ? undefined : boxes.onGridChange}
            onGridView={boxes.onGridView}
            onBoxMenu={editLockBy ? undefined : boxes.onBoxMenu}
            onDeleteBox={editLockBy ? undefined : boxes.onDeleteBox}
            renderBar={boxes.renderBar}
            onInkOnPaper={boxes.onInkOnPaper}
            showHint={
              hintPage && !!blankPage && !!boxes.onAddBox && !page.boxes?.length
            }
          >
            {editorOf()}
          </PaperFrame>
          {boxes.menu}
        </div>
        {(autoFocusTitle || offerStart) &&
          pageTab === 'notes' &&
          !reader &&
          !isTemplate &&
          !page.databaseId &&
          notebook && (
            <NewPageStart
              db={db}
              pageId={page.id}
              workspaceId={notebook.workspaceId}
              onApplied={onReload}
              onMakeDatabase={async () =>
                (await makeDatabasePage(db, page.id)) !== null
              }
            />
          )}
      </ReadingFrame>
      <div
        style={{
          display: reader || pageTab !== 'notes' ? 'none' : 'contents',
        }}
      >
        {notebook && !isTemplate && (
          <LinkedFrom
            db={db}
            pageId={page.id}
            pageTitle={page.title}
            onOpenBlock={(pageId, blockId) => {
              onOpenPage(pageId)
              revealBlock(blockId)
            }}
          />
        )}
      </div>
      {promptsOpen && notebook && (
        <Suspense fallback={null}>
          <PromptsDialog
            db={db}
            workspaceId={notebook.workspaceId}
            page={page}
            onChanged={onReload}
            onClose={() => setPromptsOpen(false)}
          />
        </Suspense>
      )}
      {historyOpen && (
        <HistoryDialog
          db={db}
          pageId={page.id}
          onClose={() => setHistoryOpen(false)}
          onRestored={(version) => {
            setHistoryOpen(false)
            toast(
              t('history.restored', {
                when: new Date(version.createdAt).toLocaleString(),
              }),
            )
            onReload()
          }}
        />
      )}
      {exporting && (
        <Suspense fallback={null}>
          <ExportDialog
            db={db}
            target={{ kind: 'page', pageId: page.id }}
            title={page.title || t('review.untitled')}
            hasSubpages={!!hasSubpages}
            getInk={async () => {
              const { inkApi } = await import('../ink/inkRuntime')
              const api = inkApi()
              if (!api) return null
              const { pagePicture } = await import('../ink/pagePicture')
              return pagePicture(api)
            }}
            onClose={() => setExporting(false)}
          />
        </Suspense>
      )}
      {naming && (
        <NameDialog
          title={t('saveTemplate.title')}
          label={t('saveTemplate.label')}
          initialValue={page.title}
          confirmLabel={t('saveTemplate.confirm')}
          onConfirm={saveTemplateAs}
          onCancel={() => setNaming(false)}
        />
      )}
    </div>
  )
}

/** Button in the page action bar; `soon` = shown but disabled. */
function Banner({
  icon,
  children,
}: {
  icon: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2.5 rounded-[10px] bg-soft px-3.5 py-2.5 text-[13px] text-muted">
      <span aria-hidden>
        <Glyph icon={icon} size={16} />
      </span>
      {children}
    </div>
  )
}

interface TitleInputProps {
  db: LearningNotesDB
  pageId: string
  /** The title as currently stored (updates live, e.g. sidebar rename). */
  savedTitle: string
  autoFocus: boolean
  readOnly?: boolean
  onEnter: () => void
}

/** Big page title. Saves shortly after typing stops; Enter jumps to the editor. */
function TitleInput({
  db,
  pageId,
  savedTitle,
  autoFocus,
  readOnly,
  onEnter,
}: TitleInputProps) {
  const [title, setTitle] = useState(savedTitle)
  const mode = pageMode.useValue()
  const [focused, setFocused] = useState(false)
  const [lastSaved, setLastSaved] = useState(savedTitle)
  const ref = useRef<HTMLTextAreaElement>(null)
  const [saver] = useState(() => createTitleSaver(db, pageId))

  // Title renamed elsewhere (sidebar): show it, unless the user is typing here.
  if (savedTitle !== lastSaved) {
    setLastSaved(savedTitle)
    if (!focused) setTitle(savedTitle)
  }

  // Save any pending change when the page closes or the app leaves the
  // screen (an iPad may stop a hidden app without warning).
  useEffect(() => {
    const flush = () => void saver.flush()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [saver])

  // While drawing, the title is inert too (nothing for Scribble to write in).
  useEffect(() => {
    ref.current?.toggleAttribute('inert', mode === 'ink')
  }, [mode])

  // Grow the textarea to fit long titles.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
    fit()
    // The width changes with the reading look (font, margins, dock): refit,
    // or the old height leaves big gaps between the lines.
    let width = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return
      width = el.clientWidth
      fit()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [title])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={title}
      placeholder={t('review.untitled')}
      aria-label={t('page.titleField')}
      autoFocus={autoFocus}
      readOnly={readOnly || mode === 'ink'}
      data-page-title
      onChange={(e) => {
        const value = e.target.value.replace(/\n/g, '')
        setTitle(value)
        saver.set(value)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onEnter()
        }
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        void saver.flush()
      }}
      className="mb-2 block w-full resize-none overflow-hidden bg-transparent text-[40px] leading-[1.2] font-bold tracking-[-0.025em] outline-none placeholder:text-muted"
    />
  )
}
