import { useRef } from 'react'
import { t } from '../../i18n/t'
import type { ResolvedRow } from '../databaseQuery'
import { dayText } from './calendarData'
import type { DaySpan } from './calendarSpans'
import { Popover } from './Popover'
import { useRowWindow } from './useRowWindow'

/**
 * Every row of one day (the "+N more" of a crowded day). A day can hold
 * thousands of rows, so only the ones near the top of the list are drawn.
 */
export function CalendarDayList({
  anchor,
  day,
  spans,
  onOpen,
  onClose,
}: {
  anchor: HTMLElement
  day: string
  spans: readonly DaySpan[]
  onOpen: (pageId: string) => void
  onClose: () => void
}) {
  const list = useRef<HTMLUListElement>(null)
  const { range, before, after } = useRowWindow(spans.length, list)
  return (
    <Popover
      anchor={anchor}
      label={t('calendar.dayList', { day: dayText(day, true) })}
      onClose={onClose}
      width={280}
    >
      <p className="px-2.5 pt-1 pb-1.5 text-[12px] font-medium text-muted">
        {dayText(day, true)}
      </p>
      <ul ref={list}>
        {before > 0 && <li aria-hidden style={{ height: before }} />}
        {spans.slice(range.start, range.end).map(({ row }) => (
          <li key={row.page.id}>
            <button
              type="button"
              onClick={() => onOpen(row.page.id)}
              className="min-h-9 w-full truncate rounded-md px-2.5 text-start hover:bg-hover focus-visible:bg-hover"
            >
              {rowName(row)}
            </button>
          </li>
        ))}
        {after > 0 && <li aria-hidden style={{ height: after }} />}
      </ul>
    </Popover>
  )
}

const rowName = (row: ResolvedRow) => row.page.title || t('review.untitled')
