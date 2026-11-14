import { useEffect, useRef, useState } from 'react'
import type { LearningNotesDB } from '../../core/db'
import { isGridRows } from '../../core/gridRows'
import { group as historyGroup } from '../../core/historySteps'
import type { GridRow } from '../../core/types'
import { t } from '../../i18n/t'
import {
  cellCount,
  newRowId,
  normaliseFracs,
  placesOf,
  reconcile,
  rowBoxIds,
  type Preset,
} from '../grid'
import { applyLayout } from '../layoutAssistService'
import { arrangeAll, type GridInfo } from '../layoutPlan'

/**
 * Text box v2, TB-34 and TB-35: Layout Assist on the page itself. The page
 * zooms out a little and the boxes wiggle (PaperFrame's layout mode); this is
 * the Layouts strip on top and the coach line. A tile shows its result at
 * once, as one Undo step; Done only ends the mode. States picture, panel 6b.
 */

/** "Side + two": a narrow box beside two stacked ones (not in the old list). */
const SIDE: Preset = {
  id: 'sideTwo',
  cols: [
    { w: 1 / 3, stack: 1 },
    { w: 2 / 3, stack: 2 },
  ],
}

const TILES = [
  { id: 'one', label: 'layout.tile.one', cells: 3, cls: 'grid-cols-1' },
  { id: 'two', label: 'layout.tile.two', cells: 4, cls: 'grid-cols-2' },
  { id: 'six', label: 'layout.tile.six', cells: 6, cls: 'grid-cols-3' },
  {
    id: 'sideTwo',
    label: 'layout.tile.side',
    cells: 3,
    cls: 'grid-cols-[1fr_2fr]',
  },
] as const

/** The page's boxes in reading order, laid out as the "Side + two" preset (as arrangeAll does for the others). */
function arrangeSide(rows: readonly GridRow[]): GridRow[] | null {
  const ids = rows.flatMap(rowBoxIds)
  const rest = ids.filter((id) => id !== 'main')
  const n = cellCount(SIDE)
  const out: GridRow[] = []
  if (ids.includes('main'))
    out.push({ id: newRowId(), cols: [{ w: 1, boxIds: ['main'] }] })
  for (let k = 0; k < rest.length; k += n) {
    const chunk = rest.slice(k, k + n)
    let i = 0
    const cols = SIDE.cols
      .map((p) => {
        const boxIds = chunk.slice(i, i + p.stack)
        i += p.stack
        return { w: p.w, boxIds }
      })
      .filter((c) => c.boxIds.length > 0)
    const fracs = normaliseFracs(cols.map((c) => c.w))
    out.push({
      id: newRowId(),
      cols: cols.map((c, j) => ({
        ...c,
        w: Math.round(fracs[j] * 100) / 100,
      })),
    })
  }
  const clean = reconcile(out, ids)
  return isGridRows(clean) ? clean : null
}

export default function LayoutAssist({
  db,
  pageId,
  getInfo,
  onDone,
}: {
  db: LearningNotesDB
  pageId: string
  getInfo: () => GridInfo
  onDone: () => void
}) {
  const [chosen, setChosen] = useState<string | null>(null)
  const coach = useRef<HTMLParagraphElement>(null)
  // The coach line sits over the page column, not over the sidebar.
  useEffect(() => {
    const wrap = document.querySelector('[data-paper-wrap]')
    const el = coach.current
    if (!wrap || !el) return
    const place = () => {
      const r = wrap.getBoundingClientRect()
      el.style.left = r.left + r.width / 2 + 'px'
      el.style.width = Math.min(560, r.width - 32) + 'px'
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])
  const choose = async (id: string) => {
    const info = getInfo()
    const rows =
      id === SIDE.id ? arrangeSide(info.rows) : arrangeAll(info.rows, id)
    if (!rows) return
    setChosen(id)
    const places = placesOf(rows, info.heights, info.geo)
    await historyGroup('Layout', () =>
      applyLayout(db, pageId, rows, places, []),
    )
  }
  return (
    <div data-layout-assist className="pb-6">
      <div
        data-layout-strip
        role="toolbar"
        aria-label={t('layout.tile.strip')}
        className="mx-auto flex w-max max-w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface p-1.5 shadow-md"
      >
        <span className="px-2.5 text-xs font-semibold text-muted">
          {t('layout.tile.strip')}
        </span>
        {TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            aria-pressed={chosen === tile.id}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void choose(tile.id)}
            className="grid min-h-13 min-w-19 shrink-0 justify-items-center gap-1 rounded-xl bg-hover px-2 pt-1.5 pb-1 text-[11.5px] font-medium whitespace-nowrap text-muted outline-none focus-visible:outline-2 focus-visible:outline-accent aria-pressed:bg-accent/15 aria-pressed:text-accent aria-pressed:ring-[1.5px] aria-pressed:ring-accent"
          >
            <span aria-hidden className={'grid h-5 w-7.5 gap-0.5 ' + tile.cls}>
              {Array.from({ length: tile.cells }, (_, i) => (
                <i
                  key={i}
                  className={
                    'rounded-[2px] bg-current opacity-55 ' +
                    (tile.id === 'sideTwo' && i === 0 ? 'row-span-2' : '')
                  }
                />
              ))}
            </span>
            {t(tile.label)}
          </button>
        ))}
        <button
          type="button"
          data-layout-done
          onMouseDown={(e) => e.preventDefault()}
          onClick={onDone}
          className="min-h-11 shrink-0 rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {t('layout.assist.done')}
        </button>
      </div>
      <p
        ref={coach}
        data-layout-coach
        className="pointer-events-none fixed bottom-3 z-(--z-pill) -translate-x-1/2 rounded-2xl border border-line bg-surface px-4 py-3 text-center text-[13.5px] leading-snug text-ink shadow-md"
      >
        {t('layout.mode.coachV2')}
      </p>
    </div>
  )
}
