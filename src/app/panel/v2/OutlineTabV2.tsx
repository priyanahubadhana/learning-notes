import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePref } from '../../usePref'
import { Icon } from '../../tools/icons'
import type { LearningNotesDB } from '../../../core/db'
import type { Block } from '../../../core/types'
import { ClearField } from '../../../design/parts/ClearField'
import { EmptyState } from '../../../design/parts/EmptyState'
import { sampleName } from '../../../i18n/defaultNames'
import { t } from '../../../i18n/t'
import { listNotePages } from '../../../pages/pageService'
import { useUnlocked } from '../../../settings/level'
import { outlineItems, type OutlineItem, type OutlineView } from '../panelModel'
import { glideToBlock, glideWhenReady, headingAtTop } from './outlineJump'
import { buildOutlineLines, type OutlineLine } from './outlineLines'
import { flattenPages, rowWindow } from './pageOrganise'

/** Every outline line is this tall (44 px target), so the list can be windowed. */
const LINE_H = 44

const isDepth = (v: unknown): v is OutlineView['depth'] =>
  v === 1 || v === 2 || v === 3
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

/**
 * Outline (NB-B48, NB-B49, NB-P40): the whole notebook as one list. Other
 * pages fold to one line; the page being read lists its headings, with the
 * current heading highlighted and kept in the middle. Beginner reads every
 * heading; the level row, Toggles, Numbers and the fold arrows are behind
 * `nb.outlineLevels`.
 */
export function OutlineTabV2({
  db,
  notebookId,
  pageId,
  onOpenPage,
}: {
  db: LearningNotesDB
  notebookId: string
  pageId: string
  onOpenPage: (id: string) => void
}) {
  const pro = useUnlocked('nb.outlineLevels')
  const [storedDepth, setDepth] = usePref<OutlineView['depth']>(
    'outline.depth',
    isDepth,
    3,
  )
  const [storedToggles, setToggles] = usePref('outline.toggles', isBool, false)
  const [storedNumbered, setNumbered] = usePref(
    'outline.numbered',
    isBool,
    false,
  )
  // The level row is Professional; Beginner always reads every heading.
  const view: OutlineView = pro
    ? { depth: storedDepth, toggles: storedToggles, numbered: storedNumbered }
    : { depth: 3, toggles: false, numbered: false }
  const [query, setQuery] = useState('')
  // What the reader opened or folded; every other page is open only when it is being read.
  const [choice, setChoice] = useState<ReadonlyMap<string, boolean>>(new Map())
  const [foldedHeadings, setFoldedHeadings] = useState<ReadonlySet<string>>(
    new Set(),
  )
  const pages = useLiveQuery(
    () => listNotePages(db, notebookId),
    [db, notebookId],
  )
  const rows = useMemo(() => (pages ? flattenPages(pages) : []), [pages])
  const searching = query.trim() !== ''
  const openPages = useMemo(
    () =>
      new Set(
        rows
          .map((r) => r.page.id)
          .filter((id) => choice.get(id) ?? id === pageId),
      ),
    [rows, choice, pageId],
  )

  // Blocks of the pages that show headings (all pages while Finding, if not too many).
  const wanted = useMemo(() => {
    if (searching && rows.length <= 400) return rows.map((r) => r.page.id)
    return rows.map((r) => r.page.id).filter((id) => openPages.has(id))
  }, [searching, rows, openPages])
  const wantedKey = wanted.join(',')
  const blocks = useLiveQuery(async () => {
    if (wanted.length === 0) return new Map<string, Block[]>()
    const all = await db.blocks.where('pageId').anyOf(wanted).toArray()
    const by = new Map<string, Block[]>()
    for (const b of all) {
      const list = by.get(b.pageId) ?? []
      list.push(b)
      by.set(b.pageId, list)
    }
    return by
  }, [db, wantedKey])
  const items = useMemo(() => {
    const m = new Map<string, OutlineItem[]>()
    for (const [id, list] of blocks ?? []) m.set(id, outlineItems(list, view))
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, view.depth, view.toggles, view.numbered])

  const lines = useMemo(
    () =>
      buildOutlineLines({
        pages: rows.map((r) => ({
          id: r.page.id,
          title: sampleName(r.page) || t('review.untitled'),
          depth: r.depth,
        })),
        open: openPages,
        items,
        foldedHeadings,
        query,
        headingFold: pro,
      }),
    [rows, openPages, items, foldedHeadings, query, pro],
  )

  // ---- Windowed list ----
  const scroller = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewH, setViewH] = useState(0)
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const measure = () => setViewH(el.clientHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const win = rowWindow(lines.length, LINE_H, scrollTop, viewH)

  // ---- The heading being read ----
  const [seen, setSeen] = useState<{ page: string; id: string | null }>({
    page: '',
    id: null,
  })
  const current = seen.page === pageId ? seen.id : null
  const readIds = useMemo(
    () => (items.get(pageId) ?? []).map((i) => i.id),
    [items, pageId],
  )
  useEffect(() => {
    const check = () => setSeen({ page: pageId, id: headingAtTop(readIds) })
    const timer = window.setInterval(check, 300)
    return () => window.clearInterval(timer)
  }, [readIds, pageId])

  // Keep the current heading in the middle of the panel when it changes.
  const lastCentred = useRef<string | null>(null)
  useEffect(() => {
    const key = current ?? `page:${pageId}`
    if (viewH === 0 || lastCentred.current === key) return
    const at = lines.findIndex((l) =>
      current ? l.blockId === current : l.key === `p:${pageId}`,
    )
    if (at < 0) return
    lastCentred.current = key
    const top = Math.max(0, at * LINE_H - (viewH - LINE_H) / 2)
    scroller.current?.scrollTo({ top })
  }, [current, pageId, lines, viewH])

  const allFolded = rows.every((r) => !openPages.has(r.page.id))
  const flipAll = () =>
    setChoice(new Map(rows.map((r) => [r.page.id, allFolded])))
  const flipPage = (id: string) =>
    setChoice((old) => new Map(old).set(id, !openPages.has(id)))
  const flipHeading = (id: string) =>
    setFoldedHeadings((old) => {
      const next = new Set(old)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const go = (line: OutlineLine) => {
    if (line.kind === 'page') return onOpenPage(line.pageId)
    const id = line.blockId
    if (!id) return
    const toggle = line.kind === 'toggle'
    if (line.pageId === pageId) glideToBlock(id, toggle)
    else {
      onOpenPage(line.pageId)
      glideWhenReady(id, toggle)
    }
  }

  const lvlButton = (n: OutlineView['depth'], label: string) => (
    <button
      key={n}
      type="button"
      data-testid={`lpv2-level-${n}`}
      aria-pressed={view.depth === n}
      onClick={() => setDepth(n)}
    >
      {label}
    </button>
  )

  return (
    <>
      <div
        className="lpv2-bar"
        style={{ flexDirection: 'column', alignItems: 'stretch' }}
      >
        <ClearField
          type="search"
          value={query}
          placeholder={t('lp2.outline.find')}
          aria-label={t('lp2.outline.find')}
          data-testid="lpv2-outline-find"
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value)
            setScrollTop(0)
          }}
          onClear={() => setQuery('')}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!searching && rows.length > 0 && (
            <button
              type="button"
              className="lpv2-chip"
              data-testid="lpv2-fold-all"
              onClick={flipAll}
            >
              <Icon name={allFolded ? 'chevronDown' : 'chevronUp'} size={16} />
              {allFolded
                ? t('lp2.outline.expandAll')
                : t('lp2.outline.collapseAll')}
            </button>
          )}
          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
            {t('lp2.outline.whole', { count: rows.length })}
          </span>
        </div>
        {pro && (
          <div
            role="group"
            aria-label={t('lp2.outline.view')}
            data-testid="lpv2-outline-options"
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <div
              className="lpv2-seg"
              role="group"
              aria-label={t('lp2.outline.depth')}
            >
              {lvlButton(1, t('lp2.outline.h1'))}
              {lvlButton(2, t('lp2.outline.h12'))}
              {lvlButton(3, t('lp2.outline.hAll'))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="lpv2-chip"
                data-testid="lpv2-toggles"
                aria-pressed={storedToggles}
                onClick={() => setToggles(!storedToggles)}
              >
                {t('lp2.outline.toggles')}
              </button>
              <button
                type="button"
                className="lpv2-chip"
                data-testid="lpv2-numbers"
                aria-pressed={storedNumbered}
                onClick={() => setNumbered(!storedNumbered)}
              >
                {t('lp2.outline.numbers')}
              </button>
            </div>
          </div>
        )}
      </div>
      <div
        ref={scroller}
        className="lpv2-scroll"
        data-testid="lpv2-outline-scroll"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        {rows.length === 0 || (searching && lines.length === 0) ? (
          <EmptyState
            variant="inline"
            icon="list"
            text={searching ? t('lp2.outline.none') : t('lp2.pages.empty')}
            testId="lpv2-outline-empty"
          />
        ) : (
          <ul
            role="list"
            aria-label={t('lp2.tab.outline')}
            className="lpv2-list"
            data-testid="lpv2-outline"
            data-rows={win.to - win.from}
            style={
              {
                height: lines.length * LINE_H,
                '--lpv2-line-h': `${LINE_H}px`,
              } as React.CSSProperties
            }
          >
            {lines.slice(win.from, win.to).map((line, i) => {
              const isCurrent = line.blockId
                ? line.blockId === current && line.pageId === pageId
                : line.kind === 'page' &&
                  line.pageId === pageId &&
                  current === null
              return (
                <li
                  key={line.key}
                  className="lpv2-ol"
                  data-kind={line.kind}
                  data-level={line.level}
                  data-heading={line.blockId}
                  data-current={isCurrent ? '' : undefined}
                  style={{
                    top: (win.from + i) * LINE_H,
                    paddingInlineStart:
                      line.indent * 10 + (line.level > 0 ? line.level * 10 : 0),
                  }}
                >
                  {line.foldable ? (
                    <button
                      type="button"
                      className="lpv2-fold"
                      aria-expanded={!line.folded}
                      aria-label={t(
                        line.folded ? 'lp2.outline.unfold' : 'lp2.outline.fold',
                        { name: line.text },
                      )}
                      onClick={() =>
                        line.kind === 'page'
                          ? flipPage(line.pageId)
                          : flipHeading(line.blockId ?? '')
                      }
                    >
                      <Icon name="chevronRight" size={14} />
                    </button>
                  ) : (
                    <span className="lpv2-nofold" />
                  )}
                  <button
                    type="button"
                    className="lpv2-ol-t"
                    data-testid="lpv2-outline-line"
                    onClick={() => go(line)}
                  >
                    {line.number && (
                      <span
                        style={{
                          marginInlineEnd: 6,
                          color: 'var(--color-muted)',
                        }}
                      >
                        {line.number}
                      </span>
                    )}
                    {line.kind === 'toggle' && (
                      <span aria-hidden="true" style={{ marginInlineEnd: 4 }}>
                        ▸
                      </span>
                    )}
                    {line.text}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="lpv2-foot">
        <span>{t('lp2.outline.hint')}</span>
      </div>
    </>
  )
}
