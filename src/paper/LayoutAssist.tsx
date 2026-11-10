import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import type { GridRow, Page } from '../core/types'
import { t } from '../i18n/t'
import { MAIN_BOX } from './boxes'
import type { BoxPatch } from './boxService'
import {
  layoutRows,
  PRESETS,
  rowBoxIds,
  type Geometry,
  type Preset,
} from './grid'
import {
  fillSlot,
  finish,
  type Draft,
  type GridInfo,
  NEW,
  newCount,
  nextEmpty,
  noteRecentLayout,
  orderedPresets,
  previewRows,
  recentLayouts,
  startLayout,
  zonesOf,
} from './layoutPlan'
import {
  guessGeometry,
  notebookPages,
  planNotebook,
} from './layoutAssistService'

/**
 * Layout Assist (bug batch 2, items 7 and 10; docs/plans/layout-assist-plan.md).
 * Like Windows Snap Layouts + Snap Assist: pick a layout and the zone your
 * box goes in, then fill the other zones with the page's existing boxes (tap
 * or drag), "+ New box", or leave them empty (they collapse). A full-page
 * preview shows the result; nothing changes until Done. "Apply to whole
 * notebook" previews every page first. Loaded only when opened.
 */

export interface AssistResult {
  rows: GridRow[]
  fresh: string[]
  places: BoxPatch[]
}

type Step = 'pick' | 'assist' | 'notebook'
const PREVIEW_W = 168

/** A tiny diagram of a preset; each zone is a button ("my box goes here"). */
function PresetThumb({
  preset,
  name,
  onZone,
  recent,
}: {
  preset: Preset
  name: string
  onZone: (zone: number) => void
  recent: boolean
}) {
  let z = 0
  const total = zonesOf(preset).length
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-14 w-20 gap-0.5 rounded-md border border-line bg-soft p-0.5">
        {preset.cols.map((c, ci) => (
          <div
            key={ci}
            className="flex min-w-0 flex-col gap-0.5"
            style={{ flex: c.w }}
          >
            {Array.from({ length: c.stack }, () => {
              const mine = z++
              return (
                <button
                  key={mine}
                  type="button"
                  data-layout-zone={`${preset.id}:${mine}`}
                  aria-label={t('layout.assist.zone', {
                    name,
                    n: mine + 1,
                    total,
                  })}
                  onClick={() => onZone(mine)}
                  className="min-h-0 flex-1 rounded-sm bg-accent/25 hover:bg-accent/60 focus-visible:bg-accent/60"
                />
              )
            })}
          </div>
        ))}
      </div>
      <span className="text-xs text-muted">
        {name}
        {recent ? ' · ' + t('layout.assist.recent') : ''}
      </span>
    </div>
  )
}

/** Mini sheets of a laid-out page, with a renderer for each box. */
function MiniPage({
  rows,
  heights,
  geo,
  width,
  box,
}: {
  rows: readonly GridRow[]
  heights: Record<string, number>
  geo: Geometry
  width: number
  box: (id: string, w: number, h: number) => React.ReactNode
}) {
  const lay = useMemo(
    () => layoutRows(rows, heights, geo),
    [rows, heights, geo],
  )
  const period = geo.sheetH + geo.gapMm
  let bottom = 0
  for (const r of lay.values()) bottom = Math.max(bottom, r.y + r.h)
  const sheets = Math.max(1, Math.ceil((bottom + geo.bottom) / period))
  const s = width / geo.sheetW
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: sheets }, (_, i) => (
        <div
          key={i}
          data-preview-sheet={i + 1}
          aria-label={t('layout.assist.sheet', { n: i + 1 })}
          role="img"
          className="relative overflow-hidden rounded border border-line bg-surface"
          style={{ width, height: geo.sheetH * s }}
        >
          {[...lay].map(([id, r]) => {
            if (Math.floor((r.y + 1e-6) / period) !== i) return null
            const top = (r.y - i * period) * s
            const h = Math.min(r.h * s, geo.sheetH * s - top)
            return (
              <div
                key={id}
                style={{ left: r.x * s, top, width: r.w * s, height: h }}
                className="absolute"
                data-preview-box={id}
              >
                {box(id, r.w * s, h)}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

const firstLine = (text: string) => text.trim().split('\n')[0] ?? ''
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

export default function LayoutAssist({
  db,
  pageId,
  anchor,
  info,
  texts,
  sheetOf,
  onApply,
  onApplyNotebook,
  onClose,
  onFail,
}: {
  db: LearningNotesDB
  pageId: string
  anchor: string
  info: GridInfo
  /** The text of each box (for thumbnails). */
  texts: Record<string, string>
  /** The sheet (0-based) each box is on now. */
  sheetOf: Record<string, number>
  onApply: (r: AssistResult) => void
  onApplyNotebook: (presetId: string) => void
  onClose: () => void
  onFail: () => void
}) {
  const [step, setStep] = useState<Step>('pick')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [active, setActive] = useState(0)
  const [whole, setWhole] = useState(false)
  const [live, setLive] = useState('')
  const [pages, setPages] = useState<Page[] | null>(null)
  const recent = useMemo(() => recentLayouts(), [])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])
  // Esc cancels; the page stays exactly as it was.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', key, true)
    return () => document.removeEventListener('keydown', key, true)
  }, [onClose])

  const rowsNow = info.rows
  const mine = (id: string) => (sheetOf[id] ?? 0) === (sheetOf[anchor] ?? 0)
  const others = useMemo(
    () =>
      rowsNow
        .flatMap(rowBoxIds)
        .filter((id) => id !== MAIN_BOX && id !== anchor)
        .filter((id) => whole || mine(id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowsNow, anchor, whole, sheetOf],
  )
  const shown = useMemo(
    () => (draft ? previewRows(rowsNow, draft) : rowsNow),
    [draft, rowsNow],
  )
  const total = draft?.slots.length ?? 0
  const placed = new Set(draft?.slots ?? [])

  const pickZone = (preset: Preset, zone: number) => {
    const d = startLayout(rowsNow, anchor, preset.id, zone)
    if (!d) return onFail()
    setDraft(d)
    const next = nextEmpty(d, 0)
    setActive(next < 0 ? 0 : next)
    setStep('assist')
    setLive(
      t('layout.assist.choose', {
        n: next < 0 ? 1 : next + 1,
        total: d.slots.length,
      }),
    )
  }
  const put = (i: number, value: string | null) => {
    if (!draft) return
    const d = fillSlot(draft, i, value)
    setDraft(d)
    const next = nextEmpty(d, i + 1)
    if (next >= 0) {
      setActive(next)
      setLive(t('layout.assist.choose', { n: next + 1, total: d.slots.length }))
    }
  }
  const done = () => {
    if (!draft) return
    const fresh = Array.from({ length: newCount(draft) }, () => createId())
    const res = finish(rowsNow, draft, fresh)
    if (!res) return onFail()
    const lay = layoutRows(res.rows, info.heights, info.geo)
    const places: BoxPatch[] = []
    for (const [id, r] of lay)
      if (id !== MAIN_BOX)
        places.push({ id, patch: { x: r.x, y: r.y, w: r.w } })
    noteRecentLayout(draft.preset.id)
    onApply({ rows: res.rows, fresh, places })
  }
  const toNotebook = async () => {
    if (!draft) return
    const p = await db.pages.get(pageId)
    if (!p) return onFail()
    setPages(await notebookPages(db, p.notebookId))
    setStep('notebook')
  }

  const label = (id: string) => {
    const tx = firstLine(texts[id] ?? '')
    return tx || t('layout.assist.emptyBox')
  }
  const boxView = (id: string, h: number) => {
    if (id === MAIN_BOX)
      return (
        <div className="h-full w-full overflow-hidden rounded-sm bg-hover px-0.5 text-[7px] text-muted">
          {t('layout.assist.pageText')}
        </div>
      )
    const slot = /^slot:(\d+)$/.exec(id)
    if (slot) {
      const i = Number(slot[1])
      return (
        <button
          type="button"
          data-layout-slot={i}
          aria-label={t('layout.assist.choose', { n: i + 1, total })}
          onClick={() => setActive(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const dropped = e.dataTransfer.getData('text/plain')
            if (dropped) put(i, dropped)
          }}
          className={
            'flex h-full w-full items-center justify-center rounded-sm border border-dashed text-[9px] ' +
            (i === active
              ? 'border-accent bg-accent/15 text-accent'
              : 'border-line text-muted')
          }
        >
          {i + 1}
        </button>
      )
    }
    const nw = /^new:(\d+)$/.exec(id)
    if (nw)
      return (
        <div className="flex h-full w-full items-center justify-center rounded-sm border border-accent bg-accent/10 text-[8px] text-accent">
          {t('layout.assist.newBox')}
        </div>
      )
    const i = draft ? draft.slots.indexOf(id) : -1
    return (
      <div
        onDragOver={(e) => i >= 0 && e.preventDefault()}
        onDrop={(e) => {
          if (i < 0) return
          e.preventDefault()
          const dropped = e.dataTransfer.getData('text/plain')
          if (dropped) put(i, dropped)
        }}
        className={
          'h-full w-full overflow-hidden rounded-sm border bg-soft px-0.5 text-[7px] leading-tight text-ink ' +
          (id === anchor ? 'border-accent' : 'border-line')
        }
        style={{ minHeight: Math.min(h, 6) }}
      >
        {label(id)}
      </div>
    )
  }

  const body = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--scrim)] p-3"
      data-ui
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t('layout.assist.title')}
        data-layout-assist
        data-ui
        className="glass flex max-h-[94vh] w-[min(58rem,100%)] flex-col gap-3 overflow-hidden rounded-2xl p-4 text-ink shadow-[var(--elev-3)] outline-none"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            {step === 'notebook'
              ? t('layout.assist.notebookTitle')
              : t('layout.assist.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg px-3 text-sm text-muted hover:bg-hover hover:text-ink"
          >
            {t('layout.assist.cancel')}
          </button>
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {live}
        </p>

        {step === 'pick' && (
          <div className="flex flex-col gap-3 overflow-y-auto">
            <p className="text-sm text-muted">{t('layout.assist.pick')}</p>
            <div className="flex flex-wrap gap-4">
              {orderedPresets(recent).map((p) => (
                <PresetThumb
                  key={p.id}
                  preset={p}
                  name={t(('layout.' + p.id) as never)}
                  recent={recent.includes(p.id)}
                  onZone={(z) => pickZone(p, z)}
                />
              ))}
            </div>
          </div>
        )}

        {step === 'assist' && draft && (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto sm:flex-row">
            <section
              aria-label={t('layout.assist.preview')}
              className="shrink-0"
            >
              <h3 className="mb-1 text-xs font-medium text-muted">
                {t('layout.assist.preview')}
              </h3>
              <MiniPage
                rows={shown}
                heights={info.heights}
                geo={info.geo}
                width={PREVIEW_W}
                box={(id, _w, h) => boxView(id, h)}
              />
            </section>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <ol className="flex flex-col gap-1">
                {draft.slots.map((v, i) => (
                  <li
                    key={i}
                    data-layout-zone-row={i}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const dropped = e.dataTransfer.getData('text/plain')
                      if (dropped) put(i, dropped)
                    }}
                    className={
                      'flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1 text-sm ' +
                      (i === active
                        ? 'border-accent bg-accent/10'
                        : 'border-line')
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      className="min-h-11 flex-1 text-left"
                    >
                      <span className="text-muted">{i + 1}. </span>
                      {v === null
                        ? t('layout.assist.empty')
                        : v === NEW
                          ? t('layout.assist.newBox')
                          : label(v)}
                    </button>
                    <button
                      type="button"
                      onClick={() => put(i, NEW)}
                      className="min-h-11 rounded-md px-2 text-sm text-accent hover:bg-hover"
                    >
                      {t('layout.assist.newBox')}
                    </button>
                    <button
                      type="button"
                      onClick={() => put(i, null)}
                      className="min-h-11 rounded-md px-2 text-sm text-muted hover:bg-hover"
                    >
                      {t('layout.assist.leave')}
                    </button>
                  </li>
                ))}
              </ol>
              <section aria-label={t('layout.assist.tray')}>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-xs font-medium text-muted">
                    {t('layout.assist.tray')}
                  </h3>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={whole}
                      onChange={(e) => setWhole(e.target.checked)}
                    />
                    {t('layout.assist.wholePage')}
                  </label>
                </div>
                {others.length === 0 ? (
                  <p className="text-sm text-muted">
                    {t('layout.assist.none')}
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {others.map((id) => (
                      <li key={id}>
                        <button
                          type="button"
                          draggable
                          data-layout-thumb={id}
                          onDragStart={(e) =>
                            e.dataTransfer.setData('text/plain', id)
                          }
                          onClick={() => put(active, id)}
                          className={
                            'flex min-h-16 w-full flex-col items-start gap-0.5 rounded-lg border bg-soft p-2 text-left text-sm hover:bg-hover ' +
                            (placed.has(id) ? 'border-accent' : 'border-line')
                          }
                        >
                          <span className="line-clamp-2">{label(id)}</span>
                          <span className="text-xs text-muted">
                            {t('layout.assist.words', {
                              n: words(texts[id] ?? ''),
                            })}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}

        {step === 'notebook' && draft && pages && (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            <ul className="flex flex-wrap gap-3">
              {planNotebook(pages, draft.preset.id).map(({ page, rows }) => {
                const changes =
                  !!rows &&
                  (page.boxes ?? []).filter((b) => b.id !== MAIN_BOX).length > 0
                return (
                  <li key={page.id} data-notebook-thumb={page.id}>
                    {rows && changes ? (
                      <MiniPage
                        rows={rows}
                        heights={{}}
                        geo={guessGeometry(page)}
                        width={96}
                        box={(id) => (
                          <div
                            className={
                              'h-full w-full rounded-sm ' +
                              (id === MAIN_BOX ? 'bg-hover' : 'bg-accent/30')
                            }
                          />
                        )}
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center rounded border border-dashed border-line text-[10px] text-muted"
                        style={{ width: 96, height: 136 }}
                      >
                        {t('layout.assist.unchanged')}
                      </div>
                    )}
                    <div className="mt-1 w-24 truncate text-xs">
                      {page.title}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {step !== 'pick' && (
            <button
              type="button"
              onClick={() => setStep(step === 'notebook' ? 'assist' : 'pick')}
              className="min-h-11 rounded-lg px-3 text-sm text-muted hover:bg-hover"
            >
              {t('layout.assist.back')}
            </button>
          )}
          {step === 'assist' && (
            <>
              <button
                type="button"
                onClick={() => void toNotebook()}
                className="min-h-11 rounded-lg px-3 text-sm text-accent hover:bg-hover"
              >
                {t('layout.assist.notebook')}
              </button>
              <button
                type="button"
                data-layout-done
                onClick={done}
                className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
              >
                {t('layout.assist.done')}
              </button>
            </>
          )}
          {step === 'notebook' && draft && pages && (
            <button
              type="button"
              data-layout-notebook-confirm
              onClick={() => {
                noteRecentLayout(draft.preset.id)
                onApplyNotebook(draft.preset.id)
              }}
              className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
            >
              {t('layout.assist.notebookConfirm', {
                n: pages.filter(
                  (p) =>
                    (p.boxes ?? []).filter((b) => b.id !== MAIN_BOX).length > 0,
                ).length,
              })}
            </button>
          )}
        </div>
      </div>
    </div>
  )
  return createPortal(body, document.body)
}

export { PRESETS }
