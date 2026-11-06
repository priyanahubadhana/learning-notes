import { HelpLine, Tip } from '../help/Help'
import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AppUiContext, TopBarSlotContext } from '../app/appUi'
import { altShortcutLabel } from '../app/keys'
import { runTask } from '../app/errors'
import { MenuPopover, NameDialog, type MenuItem } from '../app/ui'
import { listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { pageMode } from '../editor/editPolicy'
import { PageEditor } from '../editor/PageEditor'
import type { EditorApi } from '../editor/editorContext'
import { revealBlock } from '../editor/revealBlock'
import { HistoryDialog } from '../history/HistoryDialog'
import { recordVersion } from '../history/versionService'
import { dateKey } from '../journal/dates'
import { t } from '../i18n/t'
import { getNotebook } from '../notebooks/notebookService'
import { saveAsTemplate } from '../templates/templateService'
import { getPagePath, setPagePathStyle } from './pageService'
import { PagePath } from './PagePath'
import { resolvePathStyle } from './pathStyle'
import { pageAddressItem } from './pageAddressMenu'
import { pauseMenuItem } from '../app/pauseMenu'
import { deviceModeItem } from '../app/deviceModeItems'
import { pageSections } from './sections'
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
import { useLockItem } from '../app/lock/lockMenu'
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

interface PageViewProps {
  db: LearningNotesDB
  page: Page
  /** Put the cursor in the title (for newly created pages). */
  autoFocusTitle: boolean
  onOpenPage: (pageId: string) => void
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
  /** Reloads the editor after the page was changed from outside it. */
  onReload: () => void
  /** Opens Save & restore, to restore a backup. */
  onOpenBackup: () => void
}

/** An open page: breadcrumb, action bar, banner, title and block editor. */
export function PageView({
  db,
  page,
  autoFocusTitle,
  onOpenPage,
  onOpenNewPage,
  onNewPageFromTemplate,
  onReview,
  onOpenTag,
  onOpenDatabase,
  onReload,
  onOpenBackup,
}: PageViewProps) {
  const { toast } = useContext(AppUiContext)
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
  const isToday = page.journalDate === dateKey(new Date())

  // History: earlier copies of this page.
  const [historyOpen, setHistoryOpen] = useState(false)
  const openHistory = () =>
    runTask(
      (async () => {
        await editor.current?.flush()
        await recordVersion(db, page.id, { force: true }) // newest edits too
        setHistoryOpen(true)
      })(),
    )

  // "Save as template" asks for a name first.
  const [naming, setNaming] = useState(false)
  const saveTemplate = () => setNaming(true)

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
      ? [pauseMenuItem(db, 'page', page.id, page.title, !!page.paused, toast)]
      : []),
    { label: t('history.button'), icon: '🕘', onSelect: openHistory },
    { label: t('tool.readerFull'), icon: '📖', onSelect: openReader },
    ...lockItem,
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
            icon: '📋',
            onSelect: saveTemplate,
          },
        ]
      : []),
    {
      label: t('page.import'),
      icon: '⤓',
      disabled: true,
      hint: t('page.comingSoon'),
      onSelect: () => {},
    },
    {
      label: t('page.export'),
      icon: '⤒',
      disabled: true,
      hint: t('page.comingSoon'),
      onSelect: () => {},
    },
    {
      label: t('panel.open'),
      icon: '🔍',
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
    {
      label: t('page.restoreBackup'),
      icon: '⤓',
      onSelect: onOpenBackup,
    },
  ]

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
              title={t('page.more')}
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
          <Banner icon="📋">
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
          <Banner icon="☀">
            <span className="flex-1">
              <b className="font-semibold text-ink">{t('page.today.title')}</b>
              {t('page.today.text')}
            </span>
          </Banner>
        )}
      </div>
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
          autoFocus={autoFocusTitle}
          readOnly={reader}
          onEnter={() => editor.current?.focus()}
        />
        <div style={{ display: reader ? 'none' : 'contents' }}>
          <RowProperties db={db} page={page} />
          <PageTags
            db={db}
            pageId={page.id}
            tagIds={page.tagIds ?? []}
            onOpenTag={onOpenTag}
          />
          <HelpLine id="page.editor" className="mb-3 text-xs text-muted" />
          <SectionChips db={db} pageId={page.id} />
        </div>
        <PageEditor
          db={db}
          pageId={page.id}
          notebookId={page.notebookId}
          onOpenPage={onOpenPage}
          onOpenNewPage={onOpenNewPage}
          onOpenTag={onOpenTag}
          onOpenDatabase={onOpenDatabase}
          onReviewCards={notebook && !isTemplate ? onReview : undefined}
          onSaveAsTemplate={notebook && !isTemplate ? saveTemplate : undefined}
          editorRef={editor}
          reading={view === 'off' ? undefined : { view }}
        />
      </ReadingFrame>
      <div style={{ display: reader ? 'none' : 'contents' }}>
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

/**
 * Jump chips for the page's sections (top-level headings), pinned to the top
 * while scrolling. Shown only on pages with enough sections.
 */
function SectionChips({ db, pageId }: { db: LearningNotesDB; pageId: string }) {
  const sections = useLiveQuery(
    async () => pageSections(await listBlocks(db, pageId)),
    [db, pageId],
  )
  if (!sections?.length) return null
  return (
    <Tip
      id="page.sections"
      // The wrapper is what sticks (a sticky child cannot leave its parent),
      // just below the docked bar when there is one at the top.
      className="sticky top-0 z-10 -mx-3 mb-3 block bg-bg px-3"
      touchInfo={false}
    >
      <nav
        aria-label={t('sections.label')}
        style={{ top: 0 }}
        className="sticky z-10 -mx-3 mb-3 flex gap-1.5 overflow-x-auto bg-bg px-3 py-2"
      >
        {sections.map((s) => (
          <button
            key={s.blockId}
            type="button"
            onClick={() => revealBlock(s.blockId)}
            className="max-w-[220px] shrink-0 truncate rounded-full border border-line px-3 py-1.5 text-[13px] leading-none text-muted hover:border-accent hover:text-accent"
          >
            {s.title}
          </button>
        ))}
      </nav>
    </Tip>
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
      <span aria-hidden>{icon}</span>
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
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
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
