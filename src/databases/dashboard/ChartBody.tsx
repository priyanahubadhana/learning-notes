import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { DbColumn } from '../../core/types'
import { t } from '../../i18n/t'
import type { ChartData, ChartGroup, ChartPoint, HeatDay } from './chartData'
import { HEAT_WEEKS } from './chartData'
import {
  groupColor,
  groupText,
  percentText,
  periodText,
  valueText,
} from './chartFormat'
import type { ChartSpec, Period } from './chartSpec'

/**
 * Draws one chart (own SVG/CSS, no chart library, theme colours) or the
 * same numbers as a table. Every value is also written out (labels,
 * legend or the table), so colour and hovering are never the only way to
 * read it.
 */
export function ChartBody({
  spec,
  data,
  columns,
  asTable,
  lessons = false,
}: {
  spec: ChartSpec
  data: ChartData
  columns: readonly DbColumn[]
  asTable: boolean
  /** The rows are Study tracker lessons (the text says "lessons"). */
  lessons?: boolean
}) {
  const fmt = (v: number | null) => valueText(v, spec, columns)
  const groupColumn = columns.find((c) => c.id === spec.groupColumnId)
  const byOption =
    Array.isArray(groupColumn?.config.options) ||
    groupColumn?.type === 'trackerStatus'

  if (data.kind === 'number') {
    return (
      <div>
        <div className="text-[30px] leading-tight font-bold tracking-tight">
          {fmt(data.value)}
        </div>
        {data.note && (
          <div className="mt-0.5 text-[12.5px] text-muted">{data.note}</div>
        )}
        {spec.measure !== 'count' && (
          <div className="mt-0.5 text-[12.5px] text-muted">
            {t(lessons ? 'dashboard.fromLessons' : 'dashboard.fromRows', {
              count: data.rows,
            })}
          </div>
        )}
      </div>
    )
  }

  if (data.kind === 'groups') {
    if (spec.groupColumnId === undefined)
      return <Note>{t('dashboard.pickColumn')}</Note>
    const groups = data.groups.map((g, i) => ({
      ...g,
      text: groupText(g, groupColumn),
      color: groupColor(g, i, byOption),
    }))
    if (data.rows === 0 && spec.kind !== 'bar')
      return <Note>{t('dashboard.noData')}</Note>
    if (asTable) {
      return (
        <DataTable
          head={[t('dashboard.col.group'), t('dashboard.col.value')]}
          rows={groups.map((g) => [g.text, fmt(g.value)])}
        />
      )
    }
    if (spec.kind === 'bar') {
      return (
        <Bars
          groups={groups}
          more={data.more}
          fmt={fmt}
          byOption={byOption}
          lessons={lessons}
        />
      )
    }
    return spec.kind === 'donut' ? (
      <Donut groups={groups} fmt={fmt} />
    ) : (
      <Progress groups={groups} fmt={fmt} />
    )
  }

  if (data.kind === 'series') {
    if (!spec.dateColumnId && !spec.history)
      return <Note>{t('dashboard.pickColumn')}</Note>
    if (data.rows === 0) return <Note>{t('dashboard.noDates')}</Note>
    if (asTable) {
      return (
        <DataTable
          head={[t('dashboard.col.when'), t('dashboard.col.value')]}
          rows={data.points.map((p) => [
            periodText(p.day, data.period, true),
            fmt(p.value),
          ])}
        />
      )
    }
    return <Line points={data.points} period={data.period} fmt={fmt} />
  }

  if (!spec.dateColumnId && !spec.history)
    return <Note>{t('dashboard.pickColumn')}</Note>
  if (asTable) {
    return (
      <DataTable
        head={[t('dashboard.col.when'), t('dashboard.col.value')]}
        rows={data.days
          .filter((d) => d.value !== 0)
          .reverse()
          .map((d) => [periodText(d.day, 'day'), fmt(d.value)])}
      />
    )
  }
  return (
    <Heatmap
      days={data.days}
      max={data.max}
      total={fmt(data.total)}
      fmt={fmt}
    />
  )
}

function Note({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-[13px] text-muted">{children}</p>
}

function DataTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="max-h-64 overflow-y-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-start text-xs text-muted">
            {head.map((h, i) => (
              <th
                key={i}
                className={`py-1 font-medium ${i ? 'text-end' : 'text-start'}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((cell, j) => (
                <td
                  key={j}
                  className={`py-1 ${j ? 'text-end tabular-nums' : ''}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type Part = ChartGroup & { text: string; color: string }

/** Horizontal bars from one baseline, value at the tip. */
function Bars({
  groups,
  more,
  fmt,
  byOption,
  lessons,
}: {
  lessons: boolean
  groups: Part[]
  more: number
  fmt: (v: number | null) => string
  /** Choice options wear their colour; other bars are one series (accent). */
  byOption: boolean
}) {
  const max = Math.max(0, ...groups.map((g) => g.value ?? 0))
  return (
    <div>
      <ul className="grid gap-1.5">
        {groups.map((g) => (
          <li
            key={g.key}
            className="grid grid-cols-[minmax(4.5rem,9rem)_1fr_auto] items-center gap-2 text-[12.5px]"
          >
            <span className="truncate" title={g.text}>
              {g.text}
            </span>
            <span className="block h-2.5 overflow-hidden rounded-e-[4px] bg-hover">
              <span
                className="block h-full rounded-e-[4px]"
                style={{
                  width: `${max > 0 ? (Math.max(0, g.value ?? 0) / max) * 100 : 0}%`,
                  background:
                    g.special || byOption ? g.color : 'var(--color-accent)',
                }}
              />
            </span>
            <span className="text-end text-muted tabular-nums">
              {fmt(g.value)}
            </span>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <p className="mt-2 text-xs text-muted">
          {t(lessons ? 'dashboard.moreLessons' : 'dashboard.more', {
            count: more,
          })}
        </p>
      )}
    </div>
  )
}

/** A legend that also gives each part's value and share. */
function Legend({
  groups,
  fmt,
  total,
  column = false,
}: {
  groups: Part[]
  fmt: (v: number | null) => string
  total: number
  column?: boolean
}) {
  return (
    <ul
      className={`flex gap-x-3 gap-y-1 text-xs text-muted ${column ? 'flex-col' : 'flex-wrap'}`}
    >
      {groups.map((g) => (
        <li key={g.key} className="flex min-w-0 items-center gap-1.5">
          <i
            aria-hidden
            className="size-[9px] shrink-0 rounded-[3px]"
            style={{ background: g.color }}
          />
          <span className="truncate text-ink">{g.text}</span>
          <span className="tabular-nums">
            {t('dashboard.share', {
              value: fmt(g.value),
              percent: percentText(g.value ?? 0, total),
            })}
          </span>
        </li>
      ))}
    </ul>
  )
}

const sumOf = (groups: Part[]) =>
  groups.reduce((s, g) => s + Math.max(0, g.value ?? 0), 0)

function Donut({
  groups,
  fmt,
}: {
  groups: Part[]
  fmt: (v: number | null) => string
}) {
  const total = sumOf(groups)
  const r = 52
  const length = 2 * Math.PI * r
  const gap = groups.filter((g) => (g.value ?? 0) > 0).length > 1 ? 2 : 0
  // Each arc starts where the ones before it end.
  const parts = groups.map((g) =>
    total > 0 ? (Math.max(0, g.value ?? 0) / total) * length : 0,
  )
  const starts = parts.map((_, i) =>
    parts.slice(0, i).reduce((sum, p) => sum + p, 0),
  )
  const label = groups.map((g) => `${g.text}: ${fmt(g.value)}`).join(', ')
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg
        viewBox="0 0 140 140"
        width="132"
        height="132"
        role="img"
        aria-label={label}
      >
        <circle
          r={r}
          cx="70"
          cy="70"
          fill="none"
          stroke="var(--color-hover)"
          strokeWidth="18"
        />
        {groups.map((g, i) => {
          const part = parts[i]
          if (part <= 0) return null
          return (
            <circle
              key={g.key}
              r={r}
              cx="70"
              cy="70"
              fill="none"
              stroke={g.color}
              strokeWidth="18"
              strokeDasharray={`${Math.max(0.5, part - gap)} ${length - Math.max(0.5, part - gap)}`}
              strokeDashoffset={-starts[i]}
              transform="rotate(-90 70 70)"
            >
              <title>{`${g.text}: ${fmt(g.value)}`}</title>
            </circle>
          )
        })}
        <text
          x="70"
          y="68"
          textAnchor="middle"
          fill="var(--color-ink)"
          fontSize="22"
          fontWeight="700"
        >
          {fmt(total)}
        </text>
        <text
          x="70"
          y="86"
          textAnchor="middle"
          fill="var(--color-muted)"
          fontSize="11"
        >
          {t('dashboard.total')}
        </text>
      </svg>
      <div className="min-w-0 flex-1">
        <Legend groups={groups} fmt={fmt} total={total} column />
      </div>
    </div>
  )
}

function Progress({
  groups,
  fmt,
}: {
  groups: Part[]
  fmt: (v: number | null) => string
}) {
  const total = sumOf(groups)
  return (
    <div>
      <div
        role="img"
        aria-label={groups
          .map((g) => `${g.text}: ${percentText(g.value ?? 0, total)}`)
          .join(', ')}
        className="flex h-3 gap-[2px] overflow-hidden rounded-[6px] bg-hover"
      >
        {groups.map((g) =>
          (g.value ?? 0) > 0 ? (
            <span
              key={g.key}
              title={`${g.text}: ${fmt(g.value)}`}
              className="h-full"
              style={{
                flex: `${Math.max(0, g.value ?? 0)} 1 0`,
                background: g.color,
              }}
            />
          ) : null,
        )}
      </div>
      <div className="mt-2.5">
        <Legend groups={groups} fmt={fmt} total={total} />
      </div>
    </div>
  )
}

/** The width of an element, kept up to date. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width)),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** Clean axis steps (1, 2, 5 × 10ⁿ) from 0 (or the lowest value) up. */
function niceTicks(min: number, max: number): number[] {
  const lo = Math.min(0, min)
  const span = max - lo || 1
  const raw = span / 3
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw)!
  const ticks: number[] = []
  for (let v = Math.floor(lo / step) * step; v < max + step; v += step) {
    ticks.push(Number(v.toPrecision(12)))
    if (v >= max) break
  }
  return ticks
}

/** A line over time with a crosshair readout (pointer or arrow keys). */
function Line({
  points,
  period,
  fmt,
}: {
  points: ChartPoint[]
  period: Period
  fmt: (v: number | null) => string
}) {
  const [ref, width] = useWidth()
  const [active, setActive] = useState<number | null>(null)
  const H = 168
  const pad = { top: 10, right: 12, bottom: 24, left: 40 }
  const W = Math.max(width, 200)
  const values = points
    .map((p) => p.value)
    .filter((v): v is number => v !== null)
  const ticks = niceTicks(Math.min(0, ...values), Math.max(1, ...values))
  const lo = ticks[0]
  const hi = ticks.at(-1)!
  const x = (i: number) =>
    pad.left +
    (points.length > 1
      ? (i * (W - pad.left - pad.right)) / (points.length - 1)
      : (W - pad.left - pad.right) / 2)
  const y = (v: number) =>
    pad.top + (1 - (v - lo) / (hi - lo || 1)) * (H - pad.top - pad.bottom)
  // Segments break where a point has no value.
  const path = points
    .map((p, i) =>
      p.value === null
        ? ''
        : `${i > 0 && points[i - 1].value !== null ? 'L' : 'M'}${x(i)},${y(p.value)}`,
    )
    .join(' ')
  const labelEvery = Math.ceil(points.length / Math.max(2, Math.floor(W / 64)))
  const last = [...points.keys()]
    .reverse()
    .find((i) => points[i].value !== null)
  const tip = active !== null ? points[active] : null

  const pick = (clientX: number, box: DOMRect) => {
    const rel = clientX - box.left
    let best = 0
    points.forEach((_, i) => {
      if (Math.abs(x(i) - rel) < Math.abs(x(best) - rel)) best = i
    })
    setActive(best)
  }

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg
          width={W}
          height={H}
          role="img"
          tabIndex={0}
          aria-label={points
            .map((p) => `${periodText(p.day, period, true)}: ${fmt(p.value)}`)
            .join(', ')}
          className="block touch-pan-y outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-accent"
          onPointerMove={(e) =>
            pick(e.clientX, e.currentTarget.getBoundingClientRect())
          }
          onPointerDown={(e) =>
            pick(e.clientX, e.currentTarget.getBoundingClientRect())
          }
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            e.preventDefault()
            const step = e.key === 'ArrowRight' ? 1 : -1
            setActive((a) =>
              Math.max(
                0,
                Math.min(
                  points.length - 1,
                  (a ?? (step > 0 ? -1 : points.length)) + step,
                ),
              ),
            )
          }}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line
                x1={pad.left}
                x2={W - pad.right}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--color-line)"
              />
              <text
                x={pad.left - 6}
                y={y(v) + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--color-muted)"
                className="tabular-nums"
              >
                {fmt(v)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i % labelEvery === 0 || i === points.length - 1 ? (
              <text
                key={p.key}
                x={x(i)}
                y={H - 6}
                // The first and last labels stay inside the chart.
                textAnchor={
                  points.length > 1 && i === points.length - 1
                    ? 'end'
                    : i === 0 && points.length > 1
                      ? 'start'
                      : 'middle'
                }
                fontSize="11"
                fill="var(--color-muted)"
              >
                {periodText(p.day, period)}
              </text>
            ) : null,
          )}
          {active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={pad.top}
              y2={H - pad.bottom}
              stroke="var(--color-muted)"
              strokeOpacity="0.5"
            />
          )}
          <path
            d={`${path}`}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) =>
            p.value !== null &&
            (i === last || i === active || points.length <= 16) ? (
              <circle
                key={p.key}
                cx={x(i)}
                cy={y(p.value)}
                r={i === active ? 5 : 4}
                fill="var(--color-accent)"
                stroke="var(--color-bg)"
                strokeWidth="2"
              />
            ) : null,
          )}
        </svg>
      )}
      {tip && active !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-line bg-bg px-2 py-1 text-xs whitespace-nowrap shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
          style={{
            left: Math.min(Math.max(x(active), 60), W - 60),
            // Above the point, or below it when the point is high up.
            top:
              tip.value !== null && y(tip.value) < 60
                ? y(tip.value) + 10
                : Math.max(0, (tip.value !== null ? y(tip.value) : H / 2) - 52),
          }}
        >
          <b className="block text-[13px] text-ink tabular-nums">
            {fmt(tip.value)}
          </b>
          <span className="text-muted">
            {periodText(tip.day, period, true)}
          </span>
        </div>
      )}
    </div>
  )
}

/** Days as small squares, a column per week; deeper colour = more. */
function Heatmap({
  days,
  max,
  total,
  fmt,
}: {
  days: HeatDay[]
  max: number
  total: string
  fmt: (v: number | null) => string
}) {
  const level = (v: number) =>
    v <= 0 || max <= 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4))
  const shade = (l: number) =>
    l === 0
      ? 'var(--color-hover)'
      : `color-mix(in srgb, var(--color-accent) ${[0, 30, 55, 78, 100][l]}%, var(--color-bg))`
  const [tip, setTip] = useState<string | null>(null)
  return (
    <div>
      <div
        role="img"
        aria-label={t('dashboard.heatTotal', {
          value: total,
          weeks: HEAT_WEEKS,
        })}
        className="grid grid-flow-col grid-rows-[repeat(7,12px)] justify-start gap-[3px] overflow-x-auto pb-0.5"
        onPointerLeave={() => setTip(null)}
      >
        {days.map((d) => (
          <i
            key={d.day}
            onPointerEnter={() =>
              setTip(
                t('dashboard.heatLabel', {
                  day: periodText(d.day, 'day'),
                  value: fmt(d.value),
                }),
              )
            }
            className="size-3 rounded-[3px]"
            style={{
              background: shade(level(d.value)),
              opacity: d.future ? 0.35 : 1,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          {t('dashboard.heatLess')}
          {[0, 1, 2, 3, 4].map((l) => (
            <i
              key={l}
              aria-hidden
              className="size-[9px] rounded-[3px]"
              style={{ background: shade(l) }}
            />
          ))}
          {t('dashboard.heatMore')}
        </span>
        <span aria-live="polite" className="text-ink">
          {tip}
        </span>
        <span className="ms-auto">
          {t('dashboard.heatTotal', { value: total, weeks: HEAT_WEEKS })}
        </span>
      </div>
    </div>
  )
}
