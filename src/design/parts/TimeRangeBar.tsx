import {
  lazy,
  Suspense,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { tp } from './textMisc'
import { useAnchoredCard } from './useAnchoredCard'
import {
  formatRange,
  isValidRange,
  rangeFor,
  todayYmd,
  type DateRange,
  type Preset,
  type WeekStart,
} from './timeRange'
import { fallbackPresets } from './timeRangePresets'
import './partsMisc.css'

const TimeRangeBuilder = lazy(() => import('./TimeRangeBuilder'))

export type TimeRangeBarProps = {
  /** Name shown before the bar. Default "Show:". */
  name?: string
  presets: Preset[]
  /** The id of the chosen preset. */
  value: string
  onChange(id: string, range: DateRange): void
  /** Shows the "Edit time range" button. */
  editable?: boolean
  onEdit?(next: { name: string; presets: Preset[] }): void
  /** Offers the custom range date picker. */
  customRange?: boolean
  /** Fixed "today" (tests, gallery); default is the real date. */
  today?: string
  weekStart?: WeekStart
  /** Start with the custom picker open (gallery state). */
  startEditing?: boolean
}

/**
 * ONE reusable "Show: Today / This week / This month" bar (SP-10). Every
 * widget in a template follows it. Same words in Beginner and Professional.
 */
export function TimeRangeBar({
  name,
  presets,
  value,
  onChange,
  editable = true,
  onEdit,
  customRange = true,
  today,
  weekStart = 1,
  startEditing = false,
}: TimeRangeBarProps) {
  const list = presets.length ? presets : fallbackPresets()
  const now = today ?? todayYmd()
  const shownName = name ?? tp('parts.range.name')
  const [custom, setCustom] = useState<DateRange | null>(null)
  const [picking, setPicking] = useState(startEditing)
  const [draft, setDraft] = useState<DateRange>({ from: now, to: now })
  const [building, setBuilding] = useState(false)
  const track = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState('none')
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(
    null,
  )
  const [bar, setBar] = useState<HTMLDivElement | null>(null)
  const [pop, setPop] = useState<HTMLDivElement | null>(null)
  const pos = useAnchoredCard({
    anchor: bar,
    card: pop,
    widthPx: 320,
    active: picking,
  })

  /** Which edge of the segment track still has hidden content. */
  const measureFade = useCallback(() => {
    const el = track.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const start = el.scrollLeft > 1
    const end = el.scrollLeft < max - 1
    const next = start && end ? 'both' : start ? 'start' : end ? 'end' : 'none'
    setFade((prev) => (prev === next ? prev : next))
    // our own thin track: native bars are hidden on touch screens
    const t =
      max > 1
        ? {
            left: Math.round((el.scrollLeft / el.scrollWidth) * 100),
            width: Math.round((el.clientWidth / el.scrollWidth) * 100),
          }
        : null
    setThumb((prev) =>
      prev?.left === t?.left && prev?.width === t?.width ? prev : t,
    )
  }, [])
  useLayoutEffect(() => {
    measureFade()
    const el = track.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measureFade)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measureFade, presets, value])

  const visible = customRange ? list : list.filter((p) => p.kind !== 'custom')
  const current = visible.find((p) => p.id === value) ?? visible[0]
  const range = useMemo(() => {
    if (!current) return null
    return current.kind === 'custom'
      ? (custom ?? rangeFor(current, now, weekStart))
      : rangeFor(current, now, weekStart)
  }, [current, custom, now, weekStart])

  const valid = isValidRange(draft.from, draft.to)

  const choose = (p: Preset) => {
    if (p.kind === 'custom') {
      setPicking(true)
      return
    }
    setPicking(false)
    onChange(p.id, rangeFor(p, now, weekStart))
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const i = visible.findIndex((p) => p.id === current?.id)
    let next = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
      next = (i + 1) % visible.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (i - 1 + visible.length) % visible.length
    if (next < 0) return
    e.preventDefault()
    choose(visible[next])
    const radios =
      track.current?.querySelectorAll<HTMLElement>('[role="radio"]')
    radios?.[next]?.focus()
  }

  const apply = () => {
    if (!valid || !current) return
    const p = visible.find((x) => x.kind === 'custom') ?? current
    setCustom({ ...draft })
    setPicking(false)
    onChange(p.id, { ...draft })
  }

  return (
    <div
      ref={setBar}
      className="pm-range"
      data-testid="time-range-bar"
      data-state={picking ? (valid ? 'editing' : 'invalid') : 'default'}
    >
      <span className="pm-range__name" id="pm-range-name">
        {shownName}
      </span>
      <div className="pm-range__scroll">
        <div
          ref={track}
          className="pm-range__track"
          role="radiogroup"
          aria-label={tp('parts.range.label')}
          data-fade={fade}
          onScroll={measureFade}
          onKeyDown={onKeyDown}
        >
          {visible.map((p) => {
            const on = p.id === current?.id
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                className="pm-seg"
                data-testid={`range-${p.id}`}
                onClick={() => choose(p)}
                ref={(el) => {
                  if (el && on)
                    el.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        {thumb && (
          <div
            className="pm-range__rail"
            data-testid="range-rail"
            aria-hidden="true"
          >
            <span
              className="pm-range__thumb"
              style={{ left: `${thumb.left}%`, width: `${thumb.width}%` }}
            />
          </div>
        )}
      </div>
      {editable && (
        <button
          type="button"
          className="pm-btn pm-btn--quiet"
          data-testid="range-edit"
          onClick={() => setBuilding(true)}
        >
          {tp('parts.range.edit')}
        </button>
      )}
      {picking && (
        <div
          ref={setPop}
          className="pm-pop"
          style={{
            left: pos && bar ? pos.left - bar.getBoundingClientRect().left : 0,
            top: pos && bar ? pos.top - bar.getBoundingClientRect().top : 0,
            visibility: pos ? undefined : 'hidden',
          }}
          role="group"
          aria-label={tp('parts.range.custom')}
          data-testid="range-picker"
        >
          <label>
            {tp('parts.range.from')}
            <input
              type="date"
              className="pm-input"
              data-testid="range-from"
              value={draft.from}
              aria-invalid={!valid}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </label>
          <label>
            {tp('parts.range.to')}
            <input
              type="date"
              className="pm-input"
              data-testid="range-to"
              value={draft.to}
              aria-invalid={!valid}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </label>
          <button
            type="button"
            className="pm-btn"
            data-testid="range-apply"
            disabled={!valid}
            onClick={apply}
          >
            {tp('parts.range.confirm')}
          </button>
          <button
            type="button"
            className="pm-btn pm-btn--quiet"
            data-testid="range-cancel"
            onClick={() => setPicking(false)}
          >
            {tp('parts.range.cancel')}
          </button>
          {!valid && (
            <p className="pm-error" role="alert" data-testid="range-invalid">
              {tp('parts.range.invalid')}
            </p>
          )}
        </div>
      )}
      <p className="pm-range__line" aria-live="polite" data-testid="range-line">
        {range ? formatRange(range) : ''}
      </p>
      {building && (
        <Suspense fallback={null}>
          <TimeRangeBuilder
            name={shownName}
            presets={list}
            onCancel={() => setBuilding(false)}
            onConfirm={(next) => {
              setBuilding(false)
              onEdit?.(next)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
