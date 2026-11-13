import { useLiveQuery } from 'dexie-react-hooks'
import {
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import { EmptyState } from '../../design/parts/EmptyState'
import { ScrollTrack } from '../../design/parts/ScrollTrack'
import { MenuPopover, NameDialog, type MenuItem } from '../../app/ui'
import { isLive } from '../../core/records'
import { listTags } from '../../tags/tagService'
import type { LearningNotesDB } from '../../core/db'
import {
  HIGHLIGHT_COLOURS,
  type Annotation,
  type HighlightColour,
} from '../../core/types'
import { t, type MessageKey } from '../../i18n/t'
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
  const [naming, setNaming] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const wide = useWide(rootRef)
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

  const tagText = (id: string) =>
    id ? `#${tagList.find((x) => x.id === id)?.name ?? ''}` : t('lib2.allTags')
  const bookIds = [...new Set((all ?? []).map((a) => a.pageId))]
  return (
    <div ref={rootRef} data-testid="knowledge">
      <div
        className="mt-2.5 mb-2"
        role="group"
        aria-label={t('lib2.knowledge.filters')}
      >
        {/* Gate 3 v4 fix 2: every filter is the shared ▾ menu chip, sized to
            its words, in one row that scrolls sideways with the thin track. */}
        <ScrollTrack
          data-testid="know-row"
          barClassName="mt-1"
          className="flex flex-nowrap items-center gap-2"
        >
          <MenuChip
            testId="know-view"
            text={t('lib2.view.button')}
            value={view}
            items={viewItems}
          />
          {view === 'all' && (
            <>
              <MenuChip
                testId="know-book"
                label={t('lib2.knowledge.book')}
                text={
                  book
                    ? (titles?.get(book) ?? book)
                    : t('lib2.knowledge.allBooks')
                }
                value={book}
                items={radio(
                  ['', ...bookIds],
                  book,
                  (x) =>
                    x ? (titles?.get(x) ?? x) : t('lib2.knowledge.allBooks'),
                  setBook,
                )}
              />
              <MenuChip
                testId="know-sort"
                label={t('lib2.sortBy')}
                text={t(SORT_LABEL[sort])}
                value={sort}
                items={radio(
                  ['newest', 'book', 'colour'],
                  sort,
                  (x) => t(SORT_LABEL[x as Sort]),
                  (x) => setSort(x as Sort),
                )}
              />
              {pro && (
                <div data-testid="know-pro-row" className="contents">
                  <MenuChip
                    testId="know-type"
                    label={t('lib2.know.type')}
                    text={t(`lib2.know.type.${f.type}`)}
                    value={f.type}
                    items={radio(
                      ['all', 'highlight', 'note', 'bookmark'],
                      f.type,
                      (x) =>
                        t(`lib2.know.type.${x as KnowledgeFilter['type']}`),
                      (x) => setF({ ...f, type: x as KnowledgeFilter['type'] }),
                    )}
                  />
                  <MenuChip
                    testId="know-tag"
                    label={t('lib2.tag')}
                    text={tagText(f.tagId)}
                    value={f.tagId}
                    items={radio(
                      ['', ...tagList.map((x) => x.id)],
                      f.tagId,
                      tagText,
                      (x) => setF({ ...f, tagId: x }),
                    )}
                  />
                  <MenuChip
                    testId="know-date"
                    label={t('lib2.know.date')}
                    text={t(`lib2.know.date.${f.date}`)}
                    value={f.date}
                    items={radio(
                      ['any', 'week', 'month'],
                      f.date,
                      (x) =>
                        t(`lib2.know.date.${x as KnowledgeFilter['date']}`),
                      (x) => setF({ ...f, date: x as KnowledgeFilter['date'] }),
                    )}
                  />
                  <MenuChip
                    testId="know-saved"
                    text={t('lib2.saved.button')}
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
                </div>
              )}
              {/* Gate 3 v5 fix 2: the five colours are one Colour ▾ chip
                  that shows the chosen dot (owner pattern 3). */}
              <MenuChip
                testId="know-colour"
                label={t('lib2.knowledge.colour')}
                text={
                  colour
                    ? t(`annot.colour.${colour}`)
                    : t('lib2.knowledge.colour')
                }
                value={colour}
                dot={colour ? COLOUR_FILL[colour] : undefined}
                items={[
                  {
                    label: t('lib2.knowledge.anyColour'),
                    icon: 'check',
                    checked: colour === '',
                    onSelect: () => setColour(''),
                  },
                  ...HIGHLIGHT_COLOURS.map((c) => ({
                    label: t(`annot.colour.${c}`),
                    icon: 'check',
                    swatch: COLOUR_FILL[c],
                    checked: colour === c,
                    onSelect: () => setColour(c),
                  })),
                ]}
              />
            </>
          )}
        </ScrollTrack>
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
          <div
            className={`grid gap-4 ${wide ? 'grid-cols-[minmax(0,1fr)_minmax(0,360px)]' : ''}`}
          >
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
                    <span className="min-w-0 flex-1">
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
                      <span
                        data-testid="highlight-meta"
                        className="block truncate text-xs text-muted"
                      >
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
                className={`rounded-[20px] border border-line p-4 ${wide ? '' : 'fixed inset-x-0 bottom-0 z-(--z-sheet) rounded-b-none bg-bg shadow-lg'}`}
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

/**
 * Gate 3 v5 fix 1: the list and the preview sit side by side only when the
 * Knowledge area itself is wide (not the window): with the side panel open
 * on iPad portrait the area is about 410 wide, so the preview is a sheet.
 */
function useWide(ref: RefObject<HTMLDivElement | null>): boolean {
  const [wide, setWide] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setWide(el.clientWidth >= WIDE_MIN)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return wide
}
const WIDE_MIN = 720

const SORT_LABEL: Record<Sort, MessageKey> = {
  newest: 'lib2.knowledge.newest',
  book: 'lib2.knowledge.bookOrder',
  colour: 'lib2.knowledge.byColour',
}

/** A list of choices with a tick on the current one. */
function radio(
  values: readonly string[],
  cur: string,
  label: (x: string) => string,
  apply: (x: string) => void,
): MenuItem[] {
  return values.map((x) => ({
    label: label(x),
    icon: 'check',
    checked: cur === x,
    onSelect: () => apply(x),
  }))
}

/** The shared ▾ menu chip: its words, then a ▾ list (MenuPopover). */
function MenuChip({
  testId,
  text,
  label,
  value,
  dot,
  items,
}: {
  testId: string
  text: string
  label?: string
  value?: string
  /** A colour dot before the words (the chosen colour). */
  dot?: string
  items: MenuItem[]
}) {
  const [at, setAt] = useState<DOMRect | null>(null)
  return (
    <>
      <button
        type="button"
        data-testid={testId}
        data-value={value}
        aria-haspopup="menu"
        aria-label={label ? `${label}: ${text}` : undefined}
        onClick={(e) => setAt(e.currentTarget.getBoundingClientRect())}
        className="inline-flex min-h-11 max-w-[14rem] shrink-0 items-center gap-1.5 truncate whitespace-nowrap rounded-full bg-soft px-3 text-sm"
      >
        {dot && (
          <span
            aria-hidden
            data-testid={`${testId}-dot`}
            className="size-3 shrink-0 rounded-full"
            style={{ background: dot }}
          />
        )}
        {text} ▾
      </button>
      {at && (
        <MenuPopover
          anchor={at}
          label={label ?? text}
          onClose={() => setAt(null)}
          items={items}
        />
      )}
    </>
  )
}
