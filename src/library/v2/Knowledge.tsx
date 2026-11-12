import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useMemo, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import { EmptyState } from '../../design/parts/EmptyState'
import { MenuPopover, NameDialog, type MenuItem } from '../../app/ui'
import { isLive } from '../../core/records'
import { listTags } from '../../tags/tagService'
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
  locatorOf,
  placeLabel,
  restoreAnnotation,
} from '../../reader/annotations/annotationService'
import { COLOUR_FILL } from '../../reader/annotations/colours'
import { makeCardsFromAnnotations } from '../../recall/cardFromAnnotation'
import { useLevel } from '../../settings/level'
import { ExportCard } from './ExportCard'
import {
  NO_FILTER,
  filterKnowledge,
  isFiltered,
  type KnowledgeFilter,
} from './knowledgeFilter'
import {
  newCollectionId,
  setPrefs,
  setPrefsWithUndo,
  useLibraryPrefs,
} from './libraryPrefs'

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
  const prefs = useLibraryPrefs()
  const [f, setF] = useState<KnowledgeFilter>(NO_FILTER)
  const book = f.book
  const colour = f.colour as HighlightColour | ''
  const setBook = (v: string) => setF({ ...f, book: v })
  const setColour = (v: HighlightColour | '') => setF({ ...f, colour: v })
  const [sort, setSort] = useState<Sort>('newest')
  const [openId, setOpenId] = useState<string | null>(null)
  const [menuAt, setMenuAt] = useState<DOMRect | null>(null)
  const [savedAt, setSavedAt] = useState<DOMRect | null>(null)
  const [naming, setNaming] = useState(false)
  const all = useLiveQuery(
    async () =>
      (await db.annotations.toArray())
        .filter((a) => isLive(a) && (a.kind !== 'highlight' || !!a.quote))
        .sort((a, b) => b.createdAt - a.createdAt),
    [db],
  )
  const tagList = useLiveQuery(() => listTags(db), [db]) ?? []
  const pageTags = useLiveQuery(
    async () =>
      new Map(
        (await db.pages.bulkGet([...new Set((all ?? []).map((a) => a.pageId))]))
          .filter((p) => !!p)
          .map((p) => [p!.id, p!.tagIds ?? []] as const),
      ),
    [db, all],
  )
  // A saved filter picked in the side panel is applied once when we open.
  const [applied, setApplied] = useState('')
  if (prefs.openSaved && prefs.openSaved !== applied) {
    const s = prefs.saved.find((x) => x.id === prefs.openSaved)
    setApplied(prefs.openSaved)
    if (s)
      setF({
        book: s.book,
        colour: s.colour,
        type: s.type,
        date: s.date,
        tagId: s.tagId,
      })
    setPrefs({ openSaved: '' })
  }
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
    const rows = filterKnowledge(all ?? [], f, { search, pageTags })
    if (sort === 'newest') return rows
    const title = (a: Annotation) => titles?.get(a.pageId) ?? ''
    return [...rows].sort((a, b) =>
      sort === 'book'
        ? title(a).localeCompare(title(b)) || a.createdAt - b.createdAt
        : (a.colour ?? '').localeCompare(b.colour ?? ''),
    )
  }, [all, f, search, pageTags, sort, titles])
  const open = shown.find((a) => a.id === openId) ?? null
  const filtered = isFiltered(f) || !!needle
  const saveFilter = (name: string) => {
    const n = name.trim().slice(0, 80)
    if (!n) return
    const id = newCollectionId(n, prefs.saved)
    const undo = setPrefsWithUndo({
      saved: [...prefs.saved, { id, name: n, ...f }],
    })
    toast(t('lib2.saved.done', { name: n }), {
      label: t('annot.undo'),
      onSelect: undo,
    })
  }
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
            {pro && (
              <div
                data-testid="know-pro-row"
                className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto"
              >
                <select
                  aria-label={t('lib2.know.type')}
                  data-testid="know-type"
                  value={f.type}
                  onChange={(e) =>
                    setF({
                      ...f,
                      type: e.target.value as KnowledgeFilter['type'],
                    })
                  }
                  className="min-h-11 shrink-0 rounded-full bg-soft px-3 text-sm"
                >
                  {(['all', 'highlight', 'note', 'bookmark'] as const).map(
                    (x) => (
                      <option key={x} value={x}>
                        {t(`lib2.know.type.${x}`)}
                      </option>
                    ),
                  )}
                </select>
                <select
                  aria-label={t('lib2.tag')}
                  data-testid="know-tag"
                  value={f.tagId}
                  onChange={(e) => setF({ ...f, tagId: e.target.value })}
                  className="min-h-11 shrink-0 rounded-full bg-soft px-3 text-sm"
                >
                  <option value="">{t('lib2.allTags')}</option>
                  {tagList.map((x) => (
                    <option key={x.id} value={x.id}>
                      #{x.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t('lib2.know.date')}
                  data-testid="know-date"
                  value={f.date}
                  onChange={(e) =>
                    setF({
                      ...f,
                      date: e.target.value as KnowledgeFilter['date'],
                    })
                  }
                  className="min-h-11 shrink-0 rounded-full bg-soft px-3 text-sm"
                >
                  {(['any', 'week', 'month'] as const).map((x) => (
                    <option key={x} value={x}>
                      {t(`lib2.know.date.${x}`)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  data-testid="know-saved"
                  aria-haspopup="menu"
                  onClick={(e) =>
                    setSavedAt(e.currentTarget.getBoundingClientRect())
                  }
                  className="min-h-11 shrink-0 rounded-full bg-soft px-3 text-sm"
                >
                  {t('lib2.saved.button')} ▾
                </button>
                {savedAt && (
                  <MenuPopover
                    anchor={savedAt}
                    onClose={() => setSavedAt(null)}
                    items={[
                      {
                        label: t('lib2.saved.save'),
                        icon: 'save',
                        disabled: !isFiltered(f),
                        onSelect: () => setNaming(true),
                      },
                      ...prefs.saved.map((s) => ({
                        label: s.name,
                        icon: 'search',
                        onSelect: () =>
                          setF({
                            book: s.book,
                            colour: s.colour,
                            type: s.type,
                            date: s.date,
                            tagId: s.tagId,
                          }),
                      })),
                    ]}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
      {naming && (
        <NameDialog
          title={t('lib2.saved.save')}
          label={t('lib2.saved.name')}
          initialValue=""
          confirmLabel={t('lib2.done')}
          onCancel={() => setNaming(false)}
          onConfirm={(name) => {
            setNaming(false)
            saveFilter(name)
          }}
        />
      )}
      {view === 'export' && <ExportCard db={db} />}
      {view === 'daily' && (
        <>
          <div
            role="radiogroup"
            aria-label={t('lib2.daily.count')}
            className="mb-2 flex items-center gap-2 text-sm"
          >
            <span className="text-muted">{t('lib2.daily.count')}</span>
            {([3, 5, 10] as const).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={prefs.dailyCount === n}
                data-testid={`daily-${n}`}
                onClick={() => setPrefs({ dailyCount: n })}
                className={`min-h-11 min-w-11 rounded-full px-3 ${prefs.dailyCount === n ? 'bg-accent/15 font-medium' : 'bg-soft'}`}
              >
                {n}
              </button>
            ))}
          </div>
          <DailyHighlights db={db} onOpen={jump} count={prefs.dailyCount} />
        </>
      )}
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
              setF(NO_FILTER)
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
                        {a.quote?.exact ||
                          a.note ||
                          t(`lib2.know.type.${a.kind}`)}
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
