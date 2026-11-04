import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { readPref, writePref } from '../app/uiPrefs'
import type { LearningNotesDB } from '../core/db'
import { sampleName } from '../i18n/defaultNames'
import { t } from '../i18n/t'
import { useMinuteClock } from '../recall/useMinuteClock'
import {
  calendarEntries,
  entriesByDay,
  type CalendarEntry,
} from './calendarEntries'
import { localDay } from './formula/formulaValue'
import { periodStart } from './dashboard/chartData'
import {
  calendarDays,
  dayText,
  monthTitle,
  shift,
  weekdayText,
  type CalendarMode,
} from './views/calendarData'

const MAX_CHIPS = 3
const MODE_KEY = 'calendar.mode'
const isMode = (v: unknown): v is CalendarMode => v === 'month' || v === 'week'

/** A chip's words: a journal day by its date, a row by its title. */
function chipText(entry: CalendarEntry): string {
  const lock = entry.locked ? '🔒 ' : ''
  if (entry.source === 'journal') return lock + dayText(entry.day)
  return lock + (sampleName({ title: entry.title }) || t('review.untitled'))
}

/**
 * Calendar: one screen with every dated database row (on its Date column)
 * and every journal day, by month or by week. Rows open their page; a day's
 * number opens (or starts) that day's journal page.
 */
export function CalendarScreen({
  db,
  workspaceId,
  onOpenPage,
  onOpenDay,
  onClose,
}: {
  db: LearningNotesDB
  workspaceId: string
  onOpenPage: (pageId: string) => void
  /** Opens (or creates) the journal page of this "YYYY-MM-DD" day. */
  onOpenDay: (day: string) => void
  onClose: () => void
}) {
  const now = useMinuteClock()
  const today = localDay(now)
  const [anchor, setAnchor] = useState(today)
  const [mode, setModeState] = useState<CalendarMode>(() =>
    readPref(MODE_KEY, isMode, 'month'),
  )
  const setMode = (next: CalendarMode) => {
    setModeState(next)
    writePref(MODE_KEY, next)
  }

  const shown = useMemo(
    () => calendarDays(new Map<string, CalendarEntry[]>(), anchor, mode),
    [anchor, mode],
  )
  const from = shown[0].day
  const to = shown[shown.length - 1].day
  const entries = useLiveQuery(
    () => calendarEntries(db, workspaceId, from, to),
    [db, workspaceId, from, to],
  )
  const days = useMemo(
    () => calendarDays(entriesByDay(entries ?? []), anchor, mode),
    [entries, anchor, mode],
  )
  const title =
    mode === 'month'
      ? monthTitle(anchor)
      : t('calendar.weekOf', {
          day: dayText(periodStart(anchor, 'week'), true),
        })
  const limit = mode === 'week' ? 12 : MAX_CHIPS
  const button =
    'min-h-11 rounded-md border border-line px-3 text-[13px] hover:bg-hover'

  return (
    <div className="mx-auto max-w-[1000px] px-4 pt-6 pb-24 phone:px-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="me-2 min-w-0 text-xl font-semibold">
          {t('calendar.screen')}
        </h1>
        <button type="button" onClick={onClose} className={button}>
          {t('calendar.close')}
        </button>
      </div>
      <p className="mb-3 text-sm text-ink-soft">{t('calendar.screenHelp')}</p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2
          className="me-2 min-w-0 text-[15px] font-semibold"
          aria-live="polite"
        >
          {title}
        </h2>
        <span className="inline-flex gap-1">
          <button
            type="button"
            aria-label={t('calendar.previous')}
            onClick={() => setAnchor(shift(anchor, mode, -1))}
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
            onClick={() => setAnchor(shift(anchor, mode, 1))}
            className={button}
          >
            ›
          </button>
        </span>
        <div
          role="group"
          aria-label={t('calendar.mode')}
          className="inline-flex gap-0.5 rounded-[10px] bg-hover p-[2px]"
        >
          {(['month', 'week'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className="min-h-11 rounded-[8px] px-3 text-[13px] text-ink-soft aria-pressed:bg-bg aria-pressed:text-ink"
            >
              {t(`calendar.${m}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-7 gap-px rounded-xl border border-line bg-line">
          {days.slice(0, 7).map((d) => (
            <div
              key={`h${d.day}`}
              className="bg-bg px-2 py-1 text-[11.5px] font-medium text-ink-soft"
            >
              {weekdayText(d.day)}
            </div>
          ))}
          {days.map((d) => (
            <div
              key={d.day}
              role="group"
              aria-label={dayText(d.day, true)}
              data-calendar-day={d.day}
              className={`bg-bg p-1.5 ${d.inPeriod ? '' : 'opacity-60'} ${
                mode === 'week' ? 'min-h-40' : 'min-h-24'
              }`}
            >
              <div className="mb-1 flex items-center text-[12px]">
                <button
                  type="button"
                  aria-label={t('calendar.openDay', { day: dayText(d.day) })}
                  onClick={() => onOpenDay(d.day)}
                  className={`grid min-h-8 min-w-8 place-items-center rounded-full ${
                    d.day === today
                      ? 'bg-accent font-medium text-white'
                      : 'text-ink-soft hover:bg-hover'
                  }`}
                >
                  {Number(d.day.slice(8, 10))}
                </button>
              </div>
              <ul className="grid gap-0.5">
                {d.rows.slice(0, limit).map((entry) => (
                  <li key={`${entry.pageId}`}>
                    <button
                      type="button"
                      onClick={() => onOpenPage(entry.pageId)}
                      data-source={entry.source}
                      title={entry.databaseName}
                      className={`w-full truncate rounded px-1.5 py-1 text-start text-[12px] hover:bg-hover ${
                        entry.source === 'journal'
                          ? 'border-s-2 border-accent bg-soft'
                          : 'bg-soft'
                      }`}
                    >
                      {chipText(entry)}
                    </button>
                  </li>
                ))}
                {d.rows.length > limit && (
                  <li className="px-1.5 text-[11.5px] text-ink-soft">
                    {t('calendar.more', { count: d.rows.length - limit })}
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
      {entries && entries.length === 0 && (
        <p className="mt-3 text-sm text-ink-soft">{t('calendar.empty')}</p>
      )}
    </div>
  )
}
