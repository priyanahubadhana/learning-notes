import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useMemo, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import { EmptyState } from '../../design/parts/EmptyState'
import { MenuPopover, type MenuItem } from '../../app/ui'
import type { LearningNotesDB } from '../../core/db'
import {
  HIGHLIGHT_COLOURS,
  type Annotation,
  type HighlightColour,
} from '../../core/types'
import { t } from '../../i18n/t'
import { DailyHighlights } from '../../reader/annotations/DailyHighlights'
import {
  deleteAnnotation,
  listAllHighlights,
  locatorOf,
  placeLabel,
  restoreAnnotation,
} from '../../reader/annotations/annotationService'
import { COLOUR_FILL } from '../../reader/annotations/colours'
import { makeCardsFromAnnotations } from '../../recall/cardFromAnnotation'
import { useLevel } from '../../settings/level'
import { ExportCard } from './ExportCard'

type View = 'all' | 'daily' | 'export'
type Sort = 'newest' | 'book' | 'colour'

/**
 * Knowledge (LB-B38..B48): your highlights first. One quiet filter row
 * (View, book, colour, sort), a preview with Jump, and Export in View.
 */
export function Knowledge({
  db,
  search,
  showStats,
  exportFocus,
  onOpenPage,
  onRead,
}: {
  db: LearningNotesDB
  search: string
  showStats: boolean
  /** Opened from More › View › Open Export: start on Export. */
  exportFocus?: boolean
  onOpenPage: (pageId: string) => void
  onRead: (pageId: string, at?: string) => void
}) {
  const { toast } = useContext(AppUiContext)
  const pro = useLevel() === 'professional'
  const [view, setView] = useState<View>(exportFocus ? 'export' : 'all')
  const [book, setBook] = useState('')
  const [colour, setColour] = useState<HighlightColour | ''>('')
  const [sort, setSort] = useState<Sort>('newest')
  const [openId, setOpenId] = useState<string | null>(null)
  const [menuAt, setMenuAt] = useState<DOMRect | null>(null)
  const all = useLiveQuery(() => listAllHighlights(db), [db])
  const titles = useLiveQuery(
    async () =>
      new Map(
        (await db.pages.bulkGet([...new Set((all ?? []).map((a) => a.pageId))]))
          .filter((p) => !!p)
          .map((p) => [p!.id, p!.title || t('review.untitled')]),
      ),
    [db, all],
  )
  const needle = search.trim().toLocaleLowerCase()
  const shown = useMemo(() => {
    const rows = (all ?? []).filter(
      (a) =>
        (!book || a.pageId === book) &&
        (!colour || a.colour === colour) &&
        (!needle ||
          `${a.quote?.exact ?? ''} ${a.note ?? ''}`
            .toLocaleLowerCase()
            .includes(needle)),
    )
    if (sort === 'newest') return rows
    const title = (a: Annotation) => titles?.get(a.pageId) ?? ''
    return [...rows].sort((a, b) =>
      sort === 'book'
        ? title(a).localeCompare(title(b)) || a.createdAt - b.createdAt
        : (a.colour ?? '').localeCompare(b.colour ?? ''),
    )
  }, [all, book, colour, needle, sort, titles])
  const open = shown.find((a) => a.id === openId) ?? null
  const filtered = !!(book || colour || needle)
  const viewItems: MenuItem[] = (
    [
      ['all', 'lib2.view.all'],
      ['daily', 'lib2.view.daily'],
      ['export', 'lib2.view.export'],
    ] as const
  ).map(([v, key]) => ({
    label: t(key),
    icon:
      v === 'export' ? 'fileDown' : v === 'daily' ? 'sparkles' : 'highlighter',
    checked: view === v,
    onSelect: () => setView(v),
  }))

  const makeCard = (a: Annotation) =>
    runTask(
      (async () => {
        const made = await makeCardsFromAnnotations(db, a.pageId, [a])
        toast(t(made.blockIds.length ? 'lib2.cardMade' : 'recall.bulkNone'))
      })(),
    )
  const remove = (a: Annotation) =>
    runTask(
      deleteAnnotation(db, a.id).then(() => {
        setOpenId(null)
        toast(t('lib2.highlightDeleted'), {
          label: t('annot.undo'),
          onSelect: () => runTask(restoreAnnotation(db, a.id)),
        })
      }),
    )
  const jump = (a: Annotation) => {
    const at = locatorOf(a.anchor)
    if (at) onRead(a.pageId, at)
    else onOpenPage(a.pageId)
  }

  const bookIds = [...new Set((all ?? []).map((a) => a.pageId))]
  return (
    <div data-testid="knowledge">
      <div
        className="mt-2.5 mb-2 flex flex-wrap items-center gap-2"
        role="group"
        aria-label={t('lib2.knowledge.filters')}
      >
        <button
          type="button"
          data-testid="know-view"
          aria-haspopup="menu"
          onClick={(e) => setMenuAt(e.currentTarget.getBoundingClientRect())}
          className="min-h-11 rounded-full bg-soft px-4 text-sm"
        >
          {t('lib2.view.button')} ▾
        </button>
        {menuAt && (
          <MenuPopover
            anchor={menuAt}
            onClose={() => setMenuAt(null)}
            items={viewItems}
          />
        )}
        {view === 'all' && (
          <>
            <select
              aria-label={t('lib2.knowledge.book')}
              value={book}
              onChange={(e) => setBook(e.target.value)}
              className="min-h-11 rounded-full bg-soft px-3 text-sm"
            >
              <option value="">{t('lib2.knowledge.allBooks')}</option>
              {bookIds.map((id) => (
                <option key={id} value={id}>
                  {titles?.get(id) ?? id}
                </option>
              ))}
            </select>
            <div
              role="group"
              aria-label={t('lib2.knowledge.colour')}
              className="flex items-center"
            >
              {HIGHLIGHT_COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={colour === c}
                  aria-label={c}
                  data-testid={`know-colour-${c}`}
                  onClick={() => setColour(colour === c ? '' : c)}
                  className={`grid size-11 place-items-center rounded-full ${colour === c ? 'outline-2 outline-accent' : ''}`}
                >
                  <span
                    className="size-4 rounded-full"
                    style={{ background: COLOUR_FILL[c] }}
                  />
                </button>
              ))}
            </div>
            <select
              aria-label={t('lib2.sortBy')}
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="min-h-11 rounded-full bg-soft px-3 text-sm"
            >
              <option value="newest">{t('lib2.knowledge.newest')}</option>
              <option value="book">{t('lib2.knowledge.bookOrder')}</option>
              <option value="colour">{t('lib2.knowledge.byColour')}</option>
            </select>
          </>
        )}
      </div>
      {view === 'export' && <ExportCard db={db} />}
      {view === 'daily' && <DailyHighlights db={db} onOpen={jump} />}
      {view === 'all' && (pro || showStats) && all && all.length > 0 && (
        <p data-testid="know-stats" className="mb-2 text-sm text-muted">
          {t('lib2.knowledge.stats', {
            n: all.length,
            b: bookIds.length,
          })}
        </p>
      )}
      {view === 'all' &&
        (all === undefined ? null : shown.length === 0 ? (
          <EmptyState
            testId="knowledge-empty"
            icon="highlighter"
            text={t(filtered ? 'library.emptyFilter' : 'lib2.knowledge.empty')}
            action={filtered ? t('lib2.clearFilters') : undefined}
            onAction={() => {
              setBook('')
              setColour('')
            }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
            <ul data-testid="highlight-list" className="flex flex-col gap-2">
              {shown.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    data-testid="highlight-row"
                    aria-pressed={openId === a.id}
                    onClick={() => setOpenId(a.id)}
                    className={`flex w-full min-h-11 gap-3 rounded-xl border p-3 text-start ${openId === a.id ? 'border-accent bg-accent/5' : 'border-line hover:bg-hover'}`}
                  >
                    <span
                      className="mt-1 size-3 shrink-0 rounded-full"
                      style={{ background: COLOUR_FILL[a.colour ?? 'yellow'] }}
                    />
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm">
                        {a.quote?.exact}
                      </span>
                      {a.note && (
                        <span className="line-clamp-1 text-xs text-muted">
                          {a.note}
                        </span>
                      )}
                      <span className="text-xs text-muted">
                        {titles?.get(a.pageId)}{' '}
                        {placeLabel(a) && `· ${placeLabel(a)}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {open && (
              <aside
                data-testid="highlight-preview"
                aria-label={t('lib2.knowledge.preview')}
                className="rounded-[20px] border border-line p-4 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-(--z-sheet) max-md:rounded-b-none max-md:bg-bg max-md:shadow-lg"
              >
                <div className="mb-2 flex items-start gap-2">
                  <p className="flex-1 text-sm leading-relaxed">
                    {open.quote?.exact}
                  </p>
                  <button
                    type="button"
                    aria-label={t('lib2.close')}
                    onClick={() => setOpenId(null)}
                    className="grid size-11 place-items-center rounded-full hover:bg-hover"
                  >
                    ✕
                  </button>
                </div>
                {open.note && (
                  <p className="mb-2 text-sm text-muted">{open.note}</p>
                )}
                <p className="mb-3 text-xs text-muted">
                  {titles?.get(open.pageId)}{' '}
                  {placeLabel(open) && `· ${placeLabel(open)}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="highlight-jump"
                    onClick={() => jump(open)}
                    className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white"
                  >
                    {t('lib2.knowledge.jump')}
                  </button>
                  <button
                    type="button"
                    data-testid="highlight-card"
                    onClick={() => makeCard(open)}
                    className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
                  >
                    {t('lib2.knowledge.makeCard')}
                  </button>
                  <button
                    type="button"
                    data-testid="highlight-delete"
                    onClick={() => remove(open)}
                    className="min-h-11 rounded-lg border border-line px-3 text-sm text-danger hover:bg-hover"
                  >
                    {t('ui.delete')}
                  </button>
                </div>
              </aside>
            )}
          </div>
        ))}
    </div>
  )
}
