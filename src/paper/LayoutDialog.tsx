import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import type { LearningNotesDB } from '../core/db'
import { frameCss, NAMED_PRESETS } from '../core/boxStyle'
import { group as historyGroup } from '../core/historySteps'
import { isLive } from '../core/records'
import type { GridRow, Page, PaperBox } from '../core/types'
import { toPlainText } from '../editor/mapping'
import { t, type MessageKey } from '../i18n/t'
import {
  BOX_COLOURS,
  boxesOf,
  groupBlocksByBox,
  MAIN_BOX,
  readingOrder,
} from './boxes'
import { updateBoxes } from './boxService'
import {
  FREE_MIN_W,
  freeMaxW,
  layoutRows,
  placesOf,
  PRESETS,
  type Geometry,
} from './grid'
import {
  applyLayout,
  guessGeometry,
  notebookPages,
  pageRows,
} from './layoutAssistService'
import { lineUpLeft, planDrop, resizeRight, spaceEvenly } from './layoutDrop'
import { arrangeAll, type GridInfo } from './layoutPlan'
import {
  applyNoteStyle,
  NOTE_LINES,
  NOTE_SIZES,
  noteLine,
  noteSize,
} from '../app/tools/main/textStyle'

/**
 * Layout mode v2 (owner, 11 Nov): a full-screen pop-up like Ctrl+P's print
 * preview. A big live preview of the page where boxes are dragged and
 * resized; a side panel (at the bottom on a phone) with the tidy choices, box
 * and text settings and page switching. Nothing is written until the check
 * mark: Done applies everything as ONE Undo step, the cross throws it away.
 */

interface Draft {
  page: Page
  rows: GridRow[]
  heights: Record<string, number>
  geo: Geometry
  texts: Record<string, string>
  /** Staged box changes (style, colour), applied on Done. */
  patches: Record<string, Partial<PaperBox>>
  dirty: boolean
}

const SNIPPET = 140
/** Width of a box that is as wide as its text, estimated from its characters (mm). */
const estimateW = (text: string, g: Geometry, x: number) =>
  Math.min(freeMaxW(g, x), Math.max(FREE_MIN_W + 4, text.length * 1.9 + 4))

async function loadDraft(
  db: LearningNotesDB,
  page: Page,
  now?: GridInfo,
): Promise<Draft> {
  const live = (
    await db.blocks.where('pageId').equals(page.id).toArray()
  ).filter(isLive)
  const groups = groupBlocksByBox(page, live)
  const texts: Record<string, string> = {}
  for (const [id, blocks] of groups)
    texts[id] = blocks
      .map((b) => toPlainText(b.content))
      .join(' ')
      .trim()
      .slice(0, SNIPPET)
  return {
    page,
    rows: now ? now.rows : pageRows(page),
    heights: now ? now.heights : {},
    geo: now ? now.geo : guessGeometry(page),
    texts,
    patches: {},
    dirty: false,
  }
}

export default function LayoutDialog({
  db,
  pageId,
  getInfo,
  onClose,
}: {
  db: LearningNotesDB
  pageId: string
  getInfo: () => GridInfo
  onClose: () => void
}) {
  const [current, setCurrent] = useState(pageId)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [pages, setPages] = useState<Page[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [live, setLive] = useState<{
    rows: GridRow[]
    id: string
    x: number
    y: number
    full: boolean
  } | null>(null)
  const [resizing, setResizing] = useState<GridRow[] | null>(null)
  const [busy, setBusy] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const holder = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)

  // The pages of this notebook, and the open page's draft from what the page measured.
  useEffect(() => {
    let alive = true
    void (async () => {
      const page = await db.pages.get(pageId)
      if (!page || !alive) return
      const d = await loadDraft(db, page, getInfo())
      if (!alive) return
      setDrafts({ [pageId]: d })
      setPages(await notebookPages(db, page.notebookId))
    })()
    return () => {
      alive = false
    }
    // Only when the pop-up opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, pageId])

  const draft = drafts[current]
  useEffect(() => {
    if (draft || !current) return
    void (async () => {
      const page = await db.pages.get(current)
      if (!page) return
      const d = await loadDraft(db, page)
      setDrafts((all) => (all[current] ? all : { ...all, [current]: d }))
    })()
  }, [db, current, draft])

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const measure = () => setWidth(Math.max(240, el.clientWidth - 32))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    holder.current?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])

  const geo: Geometry | null = useMemo(() => {
    if (!draft) return null
    const est: Record<string, number> = {}
    for (const r of draft.rows)
      if (r.x !== undefined && r.auto && r.wmm === undefined)
        for (const id of r.cols[0].boxIds)
          est[id] = estimateW(draft.texts[id] ?? '', draft.geo, r.x)
    return { ...draft.geo, autoW: { ...est, ...draft.geo.autoW } }
  }, [draft])

  const laid = useMemo(() => {
    const rowsShown = resizing ?? live?.rows ?? draft?.rows ?? []
    return draft && geo ? layoutRows(rowsShown, draft.heights, geo) : null
  }, [draft, geo, resizing, live])

  const set = useCallback(
    (fn: (d: Draft) => Draft) =>
      setDrafts((all) =>
        all[current]
          ? { ...all, [current]: { ...fn(all[current]), dirty: true } }
          : all,
      ),
    [current],
  )

  if (!draft || !geo || !laid) {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('layout.title')}
        data-layout-dialog
        className="fixed inset-0 z-[90] bg-bg"
      />,
      document.body,
    )
  }

  const sheetW = geo.sheetW
  const s = width / sheetW // px per mm
  const period = geo.sheetH + geo.gapMm
  const bottom = Math.max(
    geo.sheetH,
    ...[...laid.values()].map((r) => r.y + r.h),
  )
  const sheetCount = Math.max(1, Math.ceil((bottom + 1) / period))
  const boxes = boxesOf(draft.page)
  const byId = new Map(boxes.map((b) => [b.id, b]))
  const extra = boxes.filter((b) => b.id !== MAIN_BOX)
  const many = extra.length

  const toMm = (e: { clientX: number; clientY: number }) => {
    const r = holder.current?.getBoundingClientRect()
    return r
      ? { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s }
      : { x: 0, y: 0 }
  }

  // ---- Dragging a box on the preview
  const down = (id: string, e: ReactPointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    setSel(id)
    const el = e.currentTarget as HTMLElement
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      // The moves still arrive.
    }
    const start = { x: e.clientX, y: e.clientY }
    let moved = false
    let plan: ReturnType<typeof planDrop> | null = null
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6)
        return
      moved = true
      const p = toMm(ev)
      plan = planDrop(draft.rows, laid, id, p.x, p.y, geo)
      setLive({ rows: plan.rows, id, x: p.x, y: p.y, full: plan.full })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setLive(null)
      if (moved && plan) {
        const rows = plan.rows
        set((d) => ({ ...d, rows }))
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  // ---- Pulling the right edge
  const grow = (id: string, e: ReactPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      // The moves still arrive.
    }
    let rows: GridRow[] | null = null
    const move = (ev: PointerEvent) => {
      rows = resizeRight(draft.rows, laid, id, toMm(ev).x, geo)
      setResizing(rows)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setResizing(null)
      if (rows) {
        const next = rows
        set((d) => ({ ...d, rows: next }))
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  // ---- Tidy choices
  const tidy = (rows: GridRow[] | null) => {
    if (rows) set((d) => ({ ...d, rows }))
  }
  const patchBox = (id: string, patch: Partial<PaperBox>) =>
    set((d) => ({
      ...d,
      patches: { ...d.patches, [id]: { ...d.patches[id], ...patch } },
    }))
  const shownBox = (id: string): PaperBox | undefined => {
    const b = byId.get(id)
    return b ? { ...b, ...draft.patches[id] } : undefined
  }
  const selected = sel ? shownBox(sel) : undefined

  // ---- Done: everything applied together, one Undo
  const done = async () => {
    if (busy) return
    setBusy(true)
    try {
      const changed = Object.values(drafts).filter((d) => d.dirty)
      await historyGroup('Layout', async () => {
        for (const d of changed) {
          await applyLayout(
            db,
            d.page.id,
            d.rows,
            placesOf(d.rows, d.heights, { ...d.geo, autoW: d.geo.autoW }),
            [],
          )
          const patches = Object.entries(d.patches).map(([id, patch]) => ({
            id,
            patch,
          }))
          if (patches.length) await updateBoxes(db, d.page.id, patches)
        }
      })
    } finally {
      setBusy(false)
      onClose()
    }
  }

  const chip =
    'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover aria-pressed:border-accent aria-pressed:text-accent'
  const head = 'mt-1 text-xs font-semibold tracking-wide text-muted uppercase'
  const pageWide = (id: string) =>
    id === MAIN_BOX ? t('layout.assist.pageText') : ''

  return createPortal(
    <div
      ref={holder}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={t('layout.title')}
      data-layout-dialog
      data-ui
      className="fixed inset-0 z-[90] flex flex-col bg-black/70 text-ink outline-none"
    >
      <div className="flex min-h-14 items-center justify-between gap-2 bg-surface px-3">
        <button
          type="button"
          data-layout-cancel
          aria-label={t('layout.assist.cancel')}
          onClick={onClose}
          className="grid size-11 place-items-center rounded-xl text-xl hover:bg-hover"
        >
          ✕
        </button>
        <h2 className="text-base font-semibold">{t('layout.title')}</h2>
        <button
          type="button"
          data-layout-done
          aria-label={t('layout.assist.done')}
          disabled={busy}
          onClick={() => void done()}
          className="grid size-11 place-items-center rounded-xl bg-accent text-xl text-white disabled:opacity-50"
        >
          ✓
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div
          ref={stage}
          data-layout-stage
          className="min-h-0 flex-1 overflow-auto p-4"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSel(null)
          }}
        >
          <p className="mb-2 text-center text-xs text-white/80">
            {t('layout.v2.coach')}
          </p>
          <div
            data-layout-preview
            aria-label={t('layout.assist.preview')}
            className="relative mx-auto"
            style={{
              width,
              height:
                sheetCount * geo.sheetH * s + (sheetCount - 1) * geo.gapMm * s,
            }}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setSel(null)
            }}
          >
            {Array.from({ length: sheetCount }, (_, i) => (
              <div
                key={i}
                aria-hidden
                className="absolute rounded-sm bg-surface shadow-lg"
                style={{
                  left: 0,
                  width,
                  top: i * period * s,
                  height: geo.sheetH * s,
                }}
              />
            ))}
            {[...laid].map(([id, rc]) => {
              const b = shownBox(id)
              const isSel = sel === id
              const dragging = live?.id === id
              return (
                <div
                  key={id}
                  data-layout-box={id}
                  data-selected={isSel ? '' : undefined}
                  onPointerDown={(e) => down(id, e)}
                  className={
                    'absolute cursor-grab touch-none overflow-hidden rounded-sm border text-[10px] leading-tight transition-[left,top,width] duration-150 motion-reduce:transition-none ' +
                    (isSel ? 'border-accent border-2' : 'border-line') +
                    (dragging ? ' opacity-60' : '')
                  }
                  style={{
                    left: rc.x * s,
                    top: rc.y * s,
                    width: Math.max(10, rc.w * s),
                    height: Math.max(10, rc.h * s),
                    background:
                      'color-mix(in srgb, var(--color-surface) 92%, var(--color-accent))',
                    ...(b ? frameCss(b.style) : {}),
                    ...(b?.colour
                      ? {
                          backgroundColor: `color-mix(in srgb, ${BOX_COLOURS[b.colour] ?? b.colour} 22%, var(--color-surface))`,
                        }
                      : {}),
                  }}
                >
                  <span className="block p-0.5 break-words text-ink-soft">
                    {draft.texts[id] || pageWide(id) || '…'}
                  </span>
                  {isSel && id !== MAIN_BOX && (
                    <span
                      data-layout-grow={id}
                      role="separator"
                      aria-label={t('paper.box.resize')}
                      onPointerDown={(e) => grow(id, e)}
                      className="absolute top-1/2 -right-3 grid size-6 -translate-y-1/2 cursor-ew-resize touch-none place-items-center rounded-full border-2 border-accent bg-bg"
                    />
                  )}
                </div>
              )
            })}
            {live && (
              <div
                aria-hidden
                data-layout-ghost
                className="pointer-events-none absolute rounded-sm border-2 border-dashed border-accent"
                style={{
                  left: (laid.get(live.id)?.x ?? 0) * s,
                  top: (laid.get(live.id)?.y ?? 0) * s,
                  width: (laid.get(live.id)?.w ?? 0) * s,
                  height: (laid.get(live.id)?.h ?? 0) * s,
                }}
              />
            )}
          </div>
        </div>
        <aside
          aria-label={t('layout.v2.panel')}
          className="max-h-[45vh] shrink-0 overflow-y-auto bg-surface p-3 md:max-h-none md:w-80"
        >
          <h3 className={head}>{t('layout.v2.tidy')}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <button
              type="button"
              data-layout-tidy="left"
              className={chip}
              onClick={() => tidy(lineUpLeft(draft.rows, geo))}
            >
              {t('layout.v2.left')}
            </button>
            <button
              type="button"
              data-layout-tidy="even"
              className={chip}
              disabled={many < 3}
              onClick={() => tidy(spaceEvenly(draft.rows, laid))}
            >
              {t('layout.v2.even')}
            </button>
            <button
              type="button"
              data-layout-tidy="one"
              className={chip}
              onClick={() => tidy(arrangeAll(draft.rows, 'one'))}
            >
              {t('layout.one')}
            </button>
          </div>
          <details className="mt-2">
            <summary className="min-h-11 cursor-pointer py-2 text-sm text-ink-soft">
              {t('layout.v2.more')}
            </summary>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.filter((p) => p.id !== 'one').map((p) => (
                <button
                  key={p.id}
                  type="button"
                  data-layout-preset={p.id}
                  className={chip}
                  onClick={() => tidy(arrangeAll(draft.rows, p.id))}
                >
                  {t(('layout.' + p.id) as MessageKey)}
                </button>
              ))}
            </div>
          </details>

          <h3 className={head + ' mt-4'}>{t('layout.v2.box')}</h3>
          {selected && sel !== MAIN_BOX ? (
            <div data-layout-box-settings className="mt-1 flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className={chip}
                  aria-pressed={!selected.style}
                  onClick={() => patchBox(sel!, { style: undefined })}
                >
                  {t('boxStyle.sw.none')}
                </button>
                {NAMED_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    data-layout-style={p.id}
                    className={chip}
                    aria-pressed={selected.style?.preset === p.id}
                    onClick={() =>
                      patchBox(sel!, { style: { ...p.style, preset: p.id } })
                    }
                  >
                    {t(('boxStyle.preset.' + p.id) as MessageKey)}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(BOX_COLOURS).map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-label={name}
                    aria-pressed={selected.colour === name}
                    onClick={() => patchBox(sel!, { colour: name })}
                    className="size-11 rounded-full border-2 border-line aria-pressed:border-accent"
                    style={{ background: BOX_COLOURS[name] }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">{t('layout.v2.pickBox')}</p>
          )}

          <h3 className={head + ' mt-4'}>{t('layout.v2.text')}</h3>
          <p className="text-xs text-muted">{t('layout.v2.textNote')}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <label className="text-sm">
              {t('main.text.size')}
              <select
                data-layout-size
                defaultValue={noteSize.get()}
                onChange={(e) => {
                  noteSize.set(Number(e.target.value))
                  applyNoteStyle()
                }}
                className="ml-1 min-h-11 rounded-lg border border-line bg-bg px-2"
              >
                {NOTE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              {t('textTool.lineSpacing')}
              <select
                data-layout-line
                defaultValue={noteLine.get()}
                onChange={(e) => {
                  noteLine.set(e.target.value as (typeof NOTE_LINES)[number])
                  applyNoteStyle()
                }}
                className="ml-1 min-h-11 rounded-lg border border-line bg-bg px-2"
              >
                {NOTE_LINES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h3 className={head + ' mt-4'}>{t('layout.v2.pages')}</h3>
          <ul className="mt-1 flex flex-col gap-1">
            {pages.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  data-layout-page={p.id}
                  aria-current={p.id === current ? 'page' : undefined}
                  onClick={() => {
                    setSel(null)
                    setCurrent(p.id)
                  }}
                  className="min-h-11 w-full truncate rounded-lg px-3 text-left text-sm hover:bg-hover aria-[current=page]:bg-hover aria-[current=page]:font-semibold aria-[current=page]:text-accent"
                >
                  {p.title || i + 1}
                </button>
              </li>
            ))}
          </ul>
          {readingOrder(extra).length === 0 && (
            <p className="mt-2 text-sm text-muted">{t('layout.v2.noBoxes')}</p>
          )}
        </aside>
      </div>
    </div>,
    document.body,
  )
}
