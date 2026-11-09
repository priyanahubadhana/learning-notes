import { displayName, sampleName } from '../i18n/defaultNames'
import { Tip } from '../help/Help'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { runTask } from '../app/errors'
import { EmptyState, MenuPopover, type MenuItem } from '../app/ui'
import { isStringOrNull } from '../app/uiPrefs'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import { isLive } from '../core/records'
import type { Notebook, Page } from '../core/types'
import { t } from '../i18n/t'
import { listNotePages } from '../pages/pageService'
import { blockText } from '../search/searchText'
import { TAG_COLORS } from '../tags/tagTools'
import {
  TAB_VIEWS,
  groupByColour,
  setNotebookView,
  setPageTabColour,
  setTabView,
  tabViewOf,
} from './notebookViews'

/** Pages that get a text preview (the rest show the title only). */
const PREVIEW_LIMIT = 60

/** The first line of text of each page, for gallery and shelf cards. */
async function previews(
  db: LearningNotesDB,
  pages: readonly Page[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (const page of pages.slice(0, PREVIEW_LIMIT)) {
    const blocks = (await db.blocks.where('pageId').equals(page.id).toArray())
      .filter(isLive)
      .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
    const lines: string[] = []
    for (const block of blocks) {
      const text = blockText(block.content).replace(/\s+/g, ' ').trim()
      if (text) lines.push(text)
      if (lines.length === 3) break
    }
    if (lines.length) out.set(page.id, lines.join(' · ').slice(0, 160))
  }
  return out
}

const pageName = (page: Page) => sampleName(page) || t('review.untitled')

/**
 * I1 · The Notes tab of a notebook in its chosen view: Default (list,
 * gallery, table or board, remembered per tab), Shelf (a cover and page
 * thumbnails) or Tabs (top-level pages as coloured section tabs).
 */
export function NotesTab({
  db,
  notebook,
  tabId,
  onOpenPage,
  onCreatePage,
}: {
  db: LearningNotesDB
  notebook: Notebook
  tabId: string
  onOpenPage: (pageId: string) => void
  onCreatePage: () => void
}) {
  const pages = useLiveQuery(
    () => listNotePages(db, notebook.id),
    [db, notebook.id],
  )
  const top = pages?.filter((p) => p.parentId === null)
  const texts = useLiveQuery(
    async () => (top ? previews(db, top) : new Map<string, string>()),
    // Reload when a page or its title changes.
    [db, top?.map((p) => `${p.id}:${p.updatedAt}`).join()],
  )
  const [viewMenu, setViewMenu] = useState<DOMRect | null>(null)
  const [layoutMenu, setLayoutMenu] = useState<DOMRect | null>(null)
  if (!pages || !top) {
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  }
  const subPages = new Map<string, number>()
  for (const page of pages) {
    if (page.parentId) {
      subPages.set(page.parentId, (subPages.get(page.parentId) ?? 0) + 1)
    }
  }
  const mode = notebook.view ?? 'default'
  const layout = tabViewOf(notebook, tabId)
  const props: ViewProps = {
    db,
    notebook,
    pages,
    top,
    texts: texts ?? new Map(),
    subPages,
    onOpenPage,
    onCreatePage,
  }

  const modeItems: MenuItem[] = (['default', 'shelf', 'tabs'] as const).map(
    (m) => ({
      label: t(`notebook.view.${m}`),
      icon: m === 'default' ? '☰' : m === 'shelf' ? '▤' : '⊟',
      checked: mode === m,
      onSelect: () =>
        runTask(
          setNotebookView(db, notebook.id, m === 'default' ? undefined : m),
        ),
    }),
  )
  const layoutItems: MenuItem[] = TAB_VIEWS.map((v) => ({
    label: t(`notebook.layout.${v}`),
    icon:
      v === 'list' ? '☰' : v === 'gallery' ? '▦' : v === 'table' ? '▥' : '▯',
    checked: layout === v,
    onSelect: () => runTask(setTabView(db, notebook.id, tabId, v)),
  }))

  return (
    <section aria-label={t('notebook.tab.notes')}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tip id="notebook.viewMenu" touchInfo={false}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={!!viewMenu}
            data-testid="notebook-view"
            onClick={(e) =>
              setViewMenu(e.currentTarget.getBoundingClientRect())
            }
            className="min-h-9 rounded-lg border border-line px-3 text-[13px] hover:bg-hover"
          >
            {t('notebook.view.button', { name: t(`notebook.view.${mode}`) })}
          </button>
        </Tip>
        {mode === 'default' && (
          <Tip id="notebook.layoutMenu" touchInfo={false}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={!!layoutMenu}
              data-testid="notebook-layout"
              onClick={(e) =>
                setLayoutMenu(e.currentTarget.getBoundingClientRect())
              }
              className="min-h-9 rounded-lg border border-line px-3 text-[13px] hover:bg-hover"
            >
              {t('notebook.layout.button', {
                name: t(`notebook.layout.${layout}`),
              })}
            </button>
          </Tip>
        )}
      </div>
      {top.length === 0 && mode !== 'shelf' ? (
        <EmptyState
          testId="notebook-empty"
          className="mb-3"
          icon="fileText"
          text={t('notebook.noPages')}
          action={t('notebook.newPage')}
          onAction={onCreatePage}
        />
      ) : mode === 'shelf' ? (
        <ShelfView {...props} />
      ) : mode === 'tabs' ? (
        <TabsView {...props} />
      ) : layout === 'gallery' ? (
        <GalleryView {...props} />
      ) : layout === 'table' ? (
        <TableView {...props} />
      ) : layout === 'board' ? (
        <BoardView {...props} />
      ) : (
        <ListView {...props} />
      )}
      {mode !== 'shelf' && (
        <button
          type="button"
          onClick={onCreatePage}
          className="mt-3 min-h-9 rounded-lg border border-line px-3 text-[13px] hover:border-accent hover:text-accent"
        >
          {t('notebook.newPage')}
        </button>
      )}
      {viewMenu && (
        <MenuPopover
          anchor={viewMenu}
          onClose={() => setViewMenu(null)}
          items={modeItems}
        />
      )}
      {layoutMenu && (
        <MenuPopover
          anchor={layoutMenu}
          onClose={() => setLayoutMenu(null)}
          items={layoutItems}
        />
      )}
    </section>
  )
}

interface ViewProps {
  db: LearningNotesDB
  notebook: Notebook
  pages: Page[]
  top: Page[]
  texts: Map<string, string>
  subPages: Map<string, number>
  onOpenPage: (pageId: string) => void
  onCreatePage: () => void
}

const subCount = (n: number | undefined) =>
  n ? t('notebook.subPages', { count: n }) : ''

function ListView({ top, subPages, onOpenPage }: ViewProps) {
  return (
    <ul className="rounded-[10px] border border-line p-1">
      {top.map((page) => (
        <li key={page.id} className="border-b border-line last:border-0">
          <button
            type="button"
            onClick={() => onOpenPage(page.id)}
            className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-start text-sm hover:bg-hover"
          >
            <span aria-hidden>📄</span>
            <span className="min-w-0 flex-1 truncate">{pageName(page)}</span>
            {!!subPages.get(page.id) && (
              <span className="shrink-0 text-xs text-muted">
                {subCount(subPages.get(page.id))}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}

function GalleryView({ top, texts, subPages, onOpenPage }: ViewProps) {
  return (
    <ul
      data-testid="view-gallery"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
    >
      {top.map((page) => (
        <li key={page.id}>
          <button
            type="button"
            onClick={() => onOpenPage(page.id)}
            className="flex min-h-32 w-full flex-col gap-1.5 rounded-[10px] border border-line p-3 text-start hover:border-accent"
            style={
              page.tabColour
                ? { borderTopColor: page.tabColour, borderTopWidth: 4 }
                : undefined
            }
          >
            <span className="text-sm font-semibold break-words">
              {pageName(page)}
            </span>
            <span className="line-clamp-3 text-xs break-words text-muted">
              {texts.get(page.id) ?? ''}
            </span>
            <span className="mt-auto text-xs text-muted">
              {subCount(subPages.get(page.id))}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function TableView({ top, subPages, onOpenPage }: ViewProps) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-line">
      <table data-testid="view-table" className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-start text-xs text-muted">
            <th className="px-3 py-2 text-start font-medium">
              {t('notebook.col.title')}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t('notebook.col.sub')}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t('notebook.col.changed')}
            </th>
          </tr>
        </thead>
        <tbody>
          {top.map((page) => (
            <tr key={page.id} className="border-b border-line last:border-0">
              <td className="p-0">
                <button
                  type="button"
                  onClick={() => onOpenPage(page.id)}
                  className="flex min-h-11 w-full items-center gap-2 px-3 text-start hover:bg-hover"
                >
                  {page.tabColour && (
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: page.tabColour }}
                    />
                  )}
                  <span className="truncate">{pageName(page)}</span>
                </button>
              </td>
              <td className="px-3 text-muted">{subPages.get(page.id) ?? 0}</td>
              <td className="px-3 whitespace-nowrap text-muted">
                {new Date(page.updatedAt).toLocaleDateString(undefined, {
                  dateStyle: 'medium',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Board: one column per section colour (no colour first). */
function BoardView({ top, onOpenPage }: ViewProps) {
  const groups = groupByColour(top)
  const keys = ['', ...TAG_COLORS].filter((k) => groups.has(k))
  return (
    <div
      data-testid="view-board"
      className="flex items-start gap-3 overflow-x-auto pb-2"
    >
      {keys.map((key) => (
        <section
          key={key || 'none'}
          aria-label={key || t('notebook.board.none')}
          className="w-56 shrink-0 rounded-[10px] border border-line p-2"
        >
          <h3
            className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted"
            style={key ? { color: key } : undefined}
          >
            <span
              aria-hidden
              className="size-2.5 rounded-full bg-line"
              style={key ? { background: key } : undefined}
            />
            {key ? t('notebook.board.coloured') : t('notebook.board.none')}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {groups.get(key)!.map((page) => (
              <li key={page.id}>
                <button
                  type="button"
                  onClick={() => onOpenPage(page.id)}
                  className="min-h-11 w-full rounded-lg border border-line px-2.5 text-start text-sm hover:border-accent"
                >
                  {pageName(page)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** A cover colour taken from the notebook's name (stable, no setting). */
function coverColour(title: string): string {
  let sum = 0
  for (const ch of title) sum = (sum + ch.charCodeAt(0)) % TAG_COLORS.length
  return TAG_COLORS[sum]
}

/** Shelf: a cover and a thumbnail for each page, like a shelf of notebooks. */
function ShelfView({
  notebook,
  top,
  texts,
  onOpenPage,
  onCreatePage,
}: ViewProps) {
  const name = displayName(sampleName(notebook)) || t('review.untitled')
  return (
    <div
      data-testid="view-shelf"
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
    >
      <div
        aria-hidden
        className="flex aspect-[3/4] items-end rounded-xl p-3 text-lg leading-tight font-bold break-words text-white shadow-md"
        style={{ background: coverColour(notebook.title) }}
      >
        {name}
      </div>
      {top.map((page) => (
        <button
          key={page.id}
          type="button"
          onClick={() => onOpenPage(page.id)}
          className="flex aspect-[3/4] flex-col gap-1.5 overflow-hidden rounded-xl border border-line bg-bg p-3 text-start shadow-sm hover:border-accent"
          style={
            page.tabColour
              ? { borderTopColor: page.tabColour, borderTopWidth: 4 }
              : undefined
          }
        >
          <span className="text-sm font-semibold break-words">
            {pageName(page)}
          </span>
          <span className="line-clamp-6 text-[11px] break-words text-muted">
            {texts.get(page.id) ?? ''}
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={onCreatePage}
        className="grid aspect-[3/4] place-items-center rounded-xl border border-dashed border-line text-sm text-muted hover:border-accent hover:text-accent"
      >
        {t('notebook.newPage')}
      </button>
    </div>
  )
}

/**
 * Tabs: the top-level pages as coloured section tabs (like OneNote); the
 * open section lists its sub-pages.
 */
function TabsView({ db, top, pages, onOpenPage }: ViewProps) {
  const [pickedId, setPickedId] = usePref(
    `sectionTab:${top[0]?.notebookId ?? ''}`,
    isStringOrNull,
    null,
  )
  const picked = top.find((p) => p.id === pickedId) ?? top[0]
  if (!picked) return null
  const rows: { page: Page; depth: number }[] = []
  const walk = (parentId: string, depth: number) => {
    for (const page of pages.filter((p) => p.parentId === parentId)) {
      rows.push({ page, depth })
      walk(page.id, depth + 1)
    }
  }
  walk(picked.id, 0)
  return (
    <div data-testid="view-tabs">
      <div
        role="tablist"
        aria-label={t('notebook.sectionTabs')}
        className="flex gap-1 overflow-x-auto"
      >
        {top.map((page) => (
          <button
            key={page.id}
            type="button"
            role="tab"
            aria-selected={page.id === picked.id}
            onClick={() => setPickedId(page.id)}
            className={`min-h-10 shrink-0 rounded-t-lg border border-b-0 border-line px-3 text-sm whitespace-nowrap ${
              page.id === picked.id ? 'font-semibold' : 'text-muted'
            }`}
            style={{
              borderTopColor: page.tabColour ?? undefined,
              borderTopWidth: 4,
              background: page.tabColour
                ? `color-mix(in srgb, ${page.tabColour} ${page.id === picked.id ? 22 : 10}%, transparent)`
                : undefined,
            }}
          >
            {pageName(page)}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        className="rounded-b-[10px] rounded-tr-[10px] border border-line p-3"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenPage(picked.id)}
            className="min-h-9 rounded-lg border border-line px-3 text-[13px] hover:border-accent hover:text-accent"
          >
            {t('notebook.openSection', { name: pageName(picked) })}
          </button>
          <div
            role="group"
            aria-label={t('notebook.tabColour')}
            className="flex items-center gap-1"
          >
            {[undefined, ...TAG_COLORS].map((colour, index) => (
              <button
                key={colour ?? 'none'}
                type="button"
                aria-label={
                  colour
                    ? t('notebook.tabColourSet', { n: index })
                    : t('notebook.tabColourNone')
                }
                aria-pressed={picked.tabColour === colour}
                onClick={() => runTask(setPageTabColour(db, picked.id, colour))}
                className="grid size-9 place-items-center rounded-full aria-pressed:bg-hover"
              >
                <span
                  aria-hidden
                  className="size-4 rounded-full border border-line"
                  style={{ background: colour ?? 'transparent' }}
                />
              </button>
            ))}
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">{t('notebook.noSubPages')}</p>
        ) : (
          <ul>
            {rows.map(({ page, depth }) => (
              <li key={page.id}>
                <button
                  type="button"
                  onClick={() => onOpenPage(page.id)}
                  style={{ paddingInlineStart: 10 + depth * 18 }}
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg pe-2.5 text-start text-sm hover:bg-hover"
                >
                  <span aria-hidden>📄</span>
                  <span className="truncate">{pageName(page)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
