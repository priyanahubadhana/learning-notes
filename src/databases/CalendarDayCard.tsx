import { useRef } from 'react'
import { t } from '../i18n/t'
import { sampleName } from '../i18n/defaultNames'
import type { CalendarEntry } from './calendarEntries'
import { dayText, weekdayText } from './views/calendarData'
import { swipeDirection } from './swipe'

/** A chip's words: a journal day by its date, a row by its title. */
function entryText(entry: CalendarEntry): string {
  const lock = entry.locked ? '🔒 ' : ''
  if (entry.source === 'journal') return lock + dayText(entry.day, true)
  return lock + (sampleName({ title: entry.title }) || t('review.untitled'))
}

/**
 * Calendar › Day: one full-page card for one day. Swipe sideways (or use
 * the arrow keys) to move to the day before or after; everything dated on
 * that day is listed, and "Open journal" opens (or starts) its journal page.
 */
export function CalendarDayCard({
  day,
  today,
  entries,
  onMove,
  onOpenPage,
  onOpenDay,
}: {
  day: string
  today: string
  entries: CalendarEntry[]
  /** -1 = the day before, 1 = the day after. */
  onMove: (by: -1 | 1) => void
  onOpenPage: (pageId: string) => void
  onOpenDay: (day: string) => void
}) {
  const start = useRef<{ x: number; y: number; at: number } | null>(null)
  const journal = entries.find((e) => e.source === 'journal')
  const rows = entries.filter((e) => e.source === 'row')
  return (
    <section
      data-calendar-card={day}
      aria-label={dayText(day, true)}
      tabIndex={0}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return // a mouse uses the arrows
        start.current = { x: e.clientX, y: e.clientY, at: e.timeStamp }
      }}
      onPointerUp={(e) => {
        const s = start.current
        start.current = null
        if (!s) return
        const by = swipeDirection(
          e.clientX - s.x,
          e.clientY - s.y,
          e.timeStamp - s.at,
        )
        if (by) onMove(by)
      }}
      onPointerCancel={() => (start.current = null)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'ArrowLeft') onMove(-1)
        if (e.key === 'ArrowRight') onMove(1)
      }}
      style={{ touchAction: 'pan-y' }}
      className="min-h-[60vh] rounded-2xl border border-line bg-bg p-5"
    >
      <p className="text-[13px] text-ink-soft">
        {weekdayText(day)}
        {day === today ? ` · ${t('calendar.today')}` : ''}
      </p>
      <p className="mb-4 text-[34px] leading-tight font-semibold">
        {dayText(day, true)}
      </p>
      <button
        type="button"
        onClick={() => onOpenDay(day)}
        className="mb-4 min-h-11 rounded-md border border-line px-3 text-[13px] hover:bg-hover"
      >
        {journal ? t('calendar.openJournal') : t('calendar.startJournal')}
      </button>
      <h3 className="mb-1 text-[13px] font-medium text-ink-soft">
        {t('calendar.dayRows')}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">{t('calendar.dayEmpty')}</p>
      ) : (
        <ul className="grid gap-1">
          {rows.map((entry) => (
            <li key={entry.pageId}>
              <button
                type="button"
                onClick={() => onOpenPage(entry.pageId)}
                className="min-h-11 w-full rounded bg-soft px-3 py-2 text-start text-[14px] hover:bg-hover"
              >
                {entryText(entry)}
                {entry.databaseName && (
                  <span className="ms-2 text-[12px] text-ink-soft">
                    {entry.databaseName}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
