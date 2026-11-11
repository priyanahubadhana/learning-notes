import { useMemo } from 'react'
import { t } from '../../i18n/t'
import {
  fullDayText,
  monthName,
  weekdayLetter,
  yearMonths,
} from './calendarSpans'

/**
 * Year view: the 12 months as small calendars. A day with rows has a dot
 * (stronger with more rows); tap a day (or a month's name) to open that
 * month. Only 12 months of buttons are ever drawn, however many rows exist.
 */
export function CalendarYear({
  year,
  counts,
  today,
  onPickDay,
}: {
  year: number
  counts: ReadonlyMap<string, number>
  today: string
  onPickDay: (day: string) => void
}) {
  const months = useMemo(() => yearMonths(year, counts), [year, counts])
  const letters = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = `2024-01-${String(i + 1).padStart(2, '0')}`
        return { key: day, letter: weekdayLetter(day) }
      }),
    [],
  )
  return (
    <section
      aria-label={t('calendar.yearLabel', { year: String(year) })}
      className="grid gap-x-5 gap-y-6 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]"
    >
      {months.map((m) => (
        <div key={m.month} data-year-month={m.month}>
          <button
            type="button"
            aria-label={t('calendar.openMonth', {
              month: `${monthName(m.month)} ${year}`,
            })}
            onClick={() => onPickDay(m.month)}
            className="mb-1.5 min-h-8 rounded-md px-1.5 text-[14px] font-semibold hover:bg-hover"
          >
            {monthName(m.month)}
          </button>
          <div className="grid grid-cols-7 text-center text-[11px] text-muted">
            {letters.map((l) => (
              <span key={l.key} aria-hidden>
                {l.letter}
              </span>
            ))}
            {Array.from({ length: m.lead }, (_, i) => (
              <span key={`lead${i}`} aria-hidden />
            ))}
            {m.days.map(({ day, count }) => {
              const label =
                count > 0
                  ? t('calendar.yearDay', {
                      day: fullDayText(day),
                      count,
                    })
                  : fullDayText(day)
              return (
                <button
                  key={day}
                  type="button"
                  data-year-day={day}
                  aria-label={label}
                  onClick={() => onPickDay(day)}
                  className="relative mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-full text-[12.5px] text-ink hover:bg-hover"
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full leading-none ${
                      day === today ? 'bg-accent font-medium text-white' : ''
                    }`}
                  >
                    {Number(day.slice(8, 10))}
                  </span>
                  {count > 0 && (
                    <span
                      aria-hidden
                      data-year-dot
                      className="absolute bottom-0.5 h-1 w-1 rounded-full bg-accent"
                      style={{ opacity: Math.min(1, 0.45 + count * 0.18) }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
