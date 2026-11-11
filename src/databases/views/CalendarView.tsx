import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import { Tip } from '../../help/Help'
import { t } from '../../i18n/t'
import { useMinuteClock } from '../../recall/useMinuteClock'
import { periodStart } from '../dashboard/chartData'
import { dateColumns } from '../dashboard/chartSpec'
import type { ResolvedRow } from '../databaseQuery'
import { addColumn, addRow, setCells, updateView } from '../databaseService'
import { dayOf, isDate, localDay } from '../formula/formulaValue'
import {
  calendarDays,
  dayText,
  monthTitle,
  shift,
  weekdayText,
} from './calendarData'
import { CalendarDayList } from './CalendarDayList'
import {
  cellChanges,
  dayDelta,
  shiftCells,
  type DateCells,
} from './calendarMove'
import {
  addYears,
  dayCounts,
  fullDayText,
  weekLanes,
  yearBounds,
  type DayLanes,
  type DaySpan,
  type LaneChip,
} from './calendarSpans'
import { CalendarYear } from './CalendarYear'
import { DragGhost } from './DragGhost'
import { useCalendarSpans } from './useCalendarSpans'
import { useDatabaseData } from './useDatabaseData'
import { useDragGesture } from './useDragGesture'
import type { ViewProps } from './viewTypes'

/** Rows shown in a day before "+N more" (a week has room for many). */
const MAX_LANES = { month: 3, week: 12 } as const
const MODES = ['month', 'week', 'year'] as const
type Mode = (typeof MODES)[number]

/** A chip being dragged: where it was picked up and where the pointer is. */
interface Drag {
  rowId: string
  title: string
  /** The day cell the chip was picked up in (a multi-day row has several). */
  grabDay: string
  cells: DateCells
  x: number
  y: number
  width: number
  offsetX: number
  offsetY: number
  /** The day under the pointer; null outside the calendar. */
  target: string | null
}

/** A chip picked up with the keyboard; `delta` days from where it was. */
interface Grab {
  rowId: string
  title: string
  cells: DateCells
  delta: number
}

const KEY_DAYS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
}

/** The date cells of a row, or null if the start has no usable date. */
function cellsOf(
  row: ResolvedRow,
  startId: string,
  endId: string | null,
): DateCells | null {
  const start = row.values[startId]
  if (!start || !isDate(start)) return null
  const end = endId ? row.values[endId] : null
  return { start: start.date, end: end && isDate(end) ? end.date : null }
}

const titleOf = (row: ResolvedRow) => row.page.title || t('review.untitled')
/** The calendar day a date cell shows on. */
const dayOfCell = (date: string) => dayOf({ date })

/**
 * Calendar view: rows on the day of a Date column, as a month, a week or a
 * year. The date column, an optional end-date column (rows then span several
 * days) and the range are saved in the view (`dateColumnId`, `endColumnId`,
 * `mode`). Drag a row to another day (mouse, Pencil, or hold with a finger)
 * or pick it up with Space and use the arrow keys: its date changes, with
 * Undo. With a real Date column, "+" on a day adds a row for that day.
 */
export function CalendarView({ db, database, view, onOpenPage }: ViewProps) {
  const ui = useContext(AppUiContext)
  const now = useMinuteClock()
  const data = useDatabaseData(db, database, now)
  const today = localDay(now)
  const root = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState(today)
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const [grab, setGrab] = useState<Grab | null>(null)
  const grabRef = useRef<Grab | null>(null)
  const [live, setLive] = useState('')
  const [more, setMore] = useState<{
    day: string
    anchor: HTMLElement
    spans: DaySpan[]
  } | null>(null)
  const columns = data?.databases.get(database.id)?.columns

  const options = useMemo(
    () => (columns ? dateColumns(columns) : []),
    [columns],
  )
  const dateColumn =
    options.find((c) => c.id === view.config.dateColumnId) ?? options[0]
  const endOptions = useMemo(
    () =>
      (columns ?? []).filter(
        (c) => c.type === 'date' && c.id !== dateColumn?.id,
      ),
    [columns, dateColumn],
  )
  const endColumn =
    endOptions.find((c) => c.id === view.config.endColumnId) ?? null
  const mode: Mode =
    view.config.mode === 'week' || view.config.mode === 'year'
      ? view.config.mode
      : 'month'
  // Only a typed Date column can be written to ("Last revised" is worked out).
  const writable = dateColumn?.type === 'date'
  const startId = dateColumn?.id ?? ''
  const endId = writable ? (endColumn?.id ?? null) : null
  const { spans, undated } = useCalendarSpans(
    data,
    columns,
    startId,
    endColumn?.id ?? null,
    now,
    view.config,
  )
  const spanById = useMemo(
    () => new Map(spans.map((s) => [s.row.page.id, s])),
    [spans],
  )

  const year = Number(anchor.slice(0, 4))
  const counts = useMemo(() => {
    if (mode !== 'year') return new Map<string, number>()
    const [first, last] = yearBounds(year)
    return dayCounts(spans, first, last)
  }, [mode, spans, year])

  const weeks = useMemo<DayLanes<ResolvedRow>[][]>(() => {
    if (mode === 'year') return []
    const days = calendarDays(new Map(), anchor, mode)
    return Array.from({ length: days.length / 7 }, (_, i) =>
      weekLanes(spans, days[i * 7].day, MAX_LANES[mode]),
    )
  }, [spans, anchor, mode])

  // ------------------------------------------------------------- changes

  const save = (changes: Record<string, string>) =>
    updateView(db, view.id, { config: { ...view.config, ...changes } })

  /** Puts the dates of a row back (the Undo of a move). */
  const restore = (rowId: string, cells: DateCells) =>
    runTask(setCells(db, rowId, cellChanges(startId, endId, cells)))

  /** Writes the new dates of a row, with an Undo that puts them back. */
  function moveTo(rowId: string, title: string, from: DateCells, by: number) {
    const next = shiftCells(from, by)
    if (!next) {
      ui.toast(t('calendar.moveFail', { name: title }))
      return
    }
    runTask(
      setCells(db, rowId, cellChanges(startId, endId, next)).then(() =>
        ui.toast(
          t('calendar.moved', {
            name: title,
            day: dayText(dayOfCell(next.start)),
          }),
          { label: t('review.undo'), onSelect: () => restore(rowId, from) },
        ),
      ),
    )
  }

  // ----------------------------------------------------- dragging (pointer)

  function setDragState(next: Drag | null) {
    dragRef.current = next
    setDrag(next)
  }

  const dayUnder = (x: number, y: number): string | null => {
    for (const el of document.elementsFromPoint(x, y)) {
      const cell = el.closest<HTMLElement>('[data-calendar-day]')
      if (cell && root.current?.contains(cell)) return cell.dataset.calendarDay!
    }
    return null
  }

  const gesture = useDragGesture(
    {
      start: (id, x, y, el) => {
        const span = spanById.get(id)
        const cells = span && cellsOf(span.row, startId, endId)
        if (!span || !cells || !writable || grabRef.current) return false
        const box = el.getBoundingClientRect()
        setMore(null)
        setDragState({
          rowId: id,
          title: titleOf(span.row),
          grabDay: el.dataset.chipDay ?? span.start,
          cells,
          x,
          y,
          width: Math.min(Math.max(box.width, 96), 220),
          offsetX: Math.min(x - box.left, 80),
          offsetY: y - box.top,
          target: dayUnder(x, y),
        })
        return true
      },
      move: (x, y) => {
        const d = dragRef.current
        if (d) setDragState({ ...d, x, y, target: dayUnder(x, y) })
      },
      end: (commit) => {
        const d = dragRef.current
        setDragState(null)
        if (!commit || !d?.target) return
        const by = dayDelta(d.grabDay, d.target)
        if (by !== 0) moveTo(d.rowId, d.title, d.cells, by)
      },
    },
    'hold',
  )

  // --------------------------------------------------- moving (keyboard)

  /** Is this day inside the month / week on screen? */
  const shown = (day: string) =>
    mode === 'week'
      ? periodStart(day, 'week') === periodStart(anchor, 'week')
      : day.slice(0, 7) === anchor.slice(0, 7)

  function startGrab(span: DaySpan) {
    const cells = cellsOf(span.row, startId, endId)
    if (!cells || !writable) return
    const g = {
      rowId: span.row.page.id,
      title: titleOf(span.row),
      cells,
      delta: 0,
    }
    grabRef.current = g
    setGrab(g)
    setLive(
      t('calendar.pickedUp', {
        name: g.title,
        day: fullDayText(dayOfCell(cells.start)),
      }),
    )
  }

  function stepGrab(by: number) {
    const g = grabRef.current
    if (!g) return
    const delta = g.delta + by
    const next = shiftCells(g.cells, delta)
    if (!next) return
    grabRef.current = { ...g, delta }
    setGrab(grabRef.current)
    runTask(setCells(db, g.rowId, cellChanges(startId, endId, next)))
    const day = dayOfCell(next.start)
    setLive(t('calendar.keyMoved', { name: g.title, day: fullDayText(day) }))
    if (!shown(day)) setAnchor(day)
  }

  /** Drops the chip (keep) or puts it back where it was. */
  function endGrab(keep: boolean) {
    const g = grabRef.current
    if (!g) return
    grabRef.current = null
    setGrab(null)
    if (g.delta === 0) return
    if (!keep) {
      restore(g.rowId, g.cells)
      setLive(t('calendar.cancelled'))
      return
    }
    const next = shiftCells(g.cells, g.delta)
    if (!next) return
    ui.toast(
      t('calendar.moved', {
        name: g.title,
        day: dayText(dayOfCell(next.start)),
      }),
      { label: t('review.undo'), onSelect: () => restore(g.rowId, g.cells) },
    )
  }

  function onChipKey(e: ReactKeyboardEvent, span: DaySpan) {
    if (!writable || e.altKey || e.ctrlKey || e.metaKey) return
    const g = grabRef.current
    if (!g) {
      if (e.key === ' ') {
        e.preventDefault()
        startGrab(span)
      }
      return
    }
    if (g.rowId !== span.row.page.id) return
    if (e.key in KEY_DAYS) {
      e.preventDefault()
      stepGrab(KEY_DAYS[e.key])
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      endGrab(true)
    } else if (e.key === 'Tab') {
      endGrab(true)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      endGrab(false)
    }
  }

  // While a chip is picked up: a press elsewhere drops it, and the chip
  // (which React moves to another day's cell) keeps the keyboard focus.
  const grabbed = grab?.rowId
  useEffect(() => {
    if (!grabbed) return
    const drop = () => endGrab(true)
    document.addEventListener('pointerdown', drop)
    return () => document.removeEventListener('pointerdown', drop)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- endGrab reads the refs, not render values
  }, [grabbed])
  useEffect(() => {
    if (!grabbed) return
    const chip = root.current?.querySelector<HTMLElement>(
      `[data-chip-label="${CSS.escape(grabbed)}"]`,
    )
    if (chip && document.activeElement !== chip) chip.focus()
  })

  // ---------------------------------------------------------------- draw

  if (!data || !columns) {
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  }
  if (!dateColumn) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <p>{t('calendar.noDate')}</p>
        <button
          type="button"
          onClick={() =>
            runTask(
              addColumn(db, database.id, {
                name: t('calendar.dateName'),
                type: 'date',
              }),
            )
          }
          className="min-h-9 rounded-lg border border-line px-3 text-[13px] text-ink hover:bg-hover"
        >
          {t('calendar.addDate')}
        </button>
      </div>
    )
  }

  const step = (by: -1 | 1) =>
    setAnchor(mode === 'year' ? addYears(anchor, by) : shift(anchor, mode, by))
  const title =
    mode === 'year'
      ? String(year)
      : mode === 'month'
        ? monthTitle(anchor)
        : t('calendar.weekOf', {
            day: dayText(periodStart(anchor, 'week'), true),
          })
  const canAdd = writable && database.kind !== 'studyTracker'
  const button =
    'min-h-8 rounded-md border border-line px-2.5 text-[13px] hover:bg-hover'
  const hintId = `calendar-hint-${view.id}`

  function chip(c: LaneChip<ResolvedRow>, day: string) {
    const { span, startsHere, endsHere, showLabel } = c
    const id = span.row.page.id
    const lifted = drag?.rowId === id || grabbed === id
    return (
      <li
        key={id}
        className={`${startsHere ? '' : '-ms-1.5'} ${endsHere ? '' : '-me-[7px]'}`}
      >
        <button
          type="button"
          data-chip-day={day}
          data-chip-label={showLabel ? id : undefined}
          tabIndex={showLabel ? 0 : -1}
          aria-hidden={showLabel ? undefined : true}
          aria-describedby={writable && showLabel ? hintId : undefined}
          onClick={() => {
            if (!gesture.consumeClick()) onOpenPage(id)
          }}
          onKeyDown={(e) => onChipKey(e, span)}
          onKeyUp={(e) => {
            if (e.key === ' ' && writable) e.preventDefault() // no click after picking up
          }}
          onPointerDown={(e) => gesture.onPointerDown(e, id)}
          onTouchStart={(e) => gesture.onTouchStart(e, id)}
          onContextMenu={(e) => writable && e.preventDefault()}
          className={`block h-[22px] w-full truncate px-1.5 text-start text-[12px] leading-[22px] select-none [-webkit-touch-callout:none] ${
            startsHere ? 'rounded-s' : 'rounded-s-none'
          } ${endsHere ? 'rounded-e' : 'rounded-e-none'} ${
            lifted
              ? 'bg-accent/15 opacity-50 ring-1 ring-accent'
              : 'bg-soft hover:bg-hover'
          }`}
        >
          {showLabel ? titleOf(span.row) : ''}
        </button>
      </li>
    )
  }

  function cell(lanes: DayLanes<ResolvedRow>) {
    const { day } = lanes
    const inPeriod = mode === 'week' || day.slice(0, 7) === anchor.slice(0, 7)
    return (
      <div
        key={day}
        data-calendar-day={day}
        className={`group relative bg-bg p-1.5 ${inPeriod ? '' : 'opacity-50'} ${
          mode === 'week' ? 'min-h-40' : 'min-h-24'
        } ${
          drag?.target === day
            ? 'bg-accent/10 ring-2 ring-accent ring-inset'
            : ''
        }`}
      >
        <div className="mb-1 flex items-center justify-between text-[12px]">
          <span
            className={
              day === today
                ? 'rounded-full bg-accent px-1.5 font-medium text-white'
                : 'text-muted'
            }
          >
            {Number(day.slice(8, 10))}
          </span>
          {canAdd && (
            <button
              type="button"
              aria-label={t('calendar.addOn', { day: dayText(day) })}
              onClick={() =>
                runTask(
                  addRow(db, database.id, {
                    values: { [dateColumn!.id]: day },
                  }).then((page) => onOpenPage(page.id)),
                )
              }
              className="rounded px-1 text-muted opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-hover"
            >
              +
            </button>
          )}
        </div>
        <ul className="grid gap-0.5">
          {lanes.slots.map((slot, i) =>
            slot ? (
              chip(slot, day)
            ) : (
              <li key={`gap${i}`} aria-hidden className="h-[22px]" />
            ),
          )}
          {lanes.hidden > 0 && (
            <li>
              <button
                type="button"
                aria-label={t('calendar.moreOn', { day: dayText(day) })}
                aria-haspopup="dialog"
                onClick={(e) =>
                  setMore({ day, anchor: e.currentTarget, spans: lanes.all })
                }
                className="w-full rounded px-1.5 text-start text-[11.5px] text-muted hover:bg-hover hover:text-ink"
              >
                {t('calendar.more', { count: lanes.hidden })}
              </button>
            </li>
          )}
        </ul>
      </div>
    )
  }

  const headDays = mode === 'year' ? [] : calendarDays(new Map(), anchor, mode)

  return (
    <div ref={root}>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <h3 className="me-2 min-w-0 text-[15px] font-semibold">{title}</h3>
        <Tip id="db.calendarNav" touchInfo={false}>
          <span className="inline-flex gap-1">
            <button
              type="button"
              aria-label={t('calendar.previous')}
              onClick={() => step(-1)}
              className={button}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setAnchor(today)}
              className={button}
            >
              {t('calendar.today')}
            </button>
            <button
              type="button"
              aria-label={t('calendar.next')}
              onClick={() => step(1)}
              className={button}
            >
              ›
            </button>
          </span>
        </Tip>
        <div
          role="group"
          aria-label={t('calendar.mode')}
          className="inline-flex gap-0.5 rounded-[8px] bg-hover p-[2px]"
        >
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => void save({ mode: m })}
              className="min-h-7 rounded-[6px] px-2.5 text-[12.5px] text-muted aria-pressed:bg-bg aria-pressed:text-ink"
            >
              {t(`calendar.${m}`)}
            </button>
          ))}
        </div>
        {options.length > 1 && (
          <select
            aria-label={t('calendar.dateColumn')}
            value={dateColumn.id}
            onChange={(e) => void save({ dateColumnId: e.target.value })}
            className="min-h-8 rounded-md border border-line bg-bg px-2 text-[13px]"
          >
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {writable && endOptions.length > 0 && (
          <select
            aria-label={t('calendar.endColumn')}
            value={endColumn?.id ?? ''}
            onChange={(e) => void save({ endColumnId: e.target.value })}
            className="min-h-8 rounded-md border border-line bg-bg px-2 text-[13px]"
          >
            <option value="">{t('calendar.noEnd')}</option>
            {endOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {mode === 'year' ? (
        <CalendarYear
          year={year}
          counts={counts}
          today={today}
          onPickDay={(day) => {
            setAnchor(day)
            void save({ mode: 'month' })
          }}
        />
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-7 gap-px rounded-xl border border-line bg-line">
            {headDays.slice(0, 7).map((d) => (
              <div
                key={`h${d.day}`}
                className="bg-bg px-2 py-1 text-[11.5px] font-medium text-muted"
              >
                {weekdayText(d.day)}
              </div>
            ))}
            {weeks.flatMap((week) => week.map((lanes) => cell(lanes)))}
          </div>
        </div>
      )}
      {mode !== 'year' && undated > 0 && (
        <p className="mt-2 text-xs text-muted">
          {t('calendar.undated', { count: undated })}
        </p>
      )}
      {writable && (
        <p id={hintId} className="sr-only">
          {t('calendar.chipHelp')}
        </p>
      )}
      <p role="status" className="sr-only">
        {live}
      </p>
      {more && (
        <CalendarDayList
          anchor={more.anchor}
          day={more.day}
          spans={more.spans}
          onOpen={(id) => {
            setMore(null)
            onOpenPage(id)
          }}
          onClose={() => setMore(null)}
        />
      )}
      {drag && (
        <DragGhost
          x={drag.x - drag.offsetX}
          y={drag.y - drag.offsetY}
          width={drag.width}
        >
          {drag.title}
          {drag.target && drag.target !== drag.grabDay && (
            <span className="ms-2 text-muted">{dayText(drag.target)}</span>
          )}
        </DragGhost>
      )}
    </div>
  )
}
