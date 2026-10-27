import { describe, expect, it } from 'vitest'
import type { Page } from '../../core/types'
import type { ResolvedRow } from '../databaseQuery'
import { addMonths, calendarDays, rowsByDay, shift } from './calendarData'

let n = 0
const row = (date: string | null): ResolvedRow => ({
  page: { id: `p${++n}`, title: `R${n}` } as Page,
  values: { when: date ? { date } : null },
  links: {},
})

describe('calendar', () => {
  it('puts rows on their day and counts the rows without a date', () => {
    const rows = [
      row('2026-10-27'),
      row('2026-10-27'),
      row('2026-10-01'),
      row(null),
    ]
    const { byDay, undated } = rowsByDay(rows, 'when')
    expect(byDay.get('2026-10-27')).toHaveLength(2)
    expect(byDay.get('2026-10-01')).toHaveLength(1)
    expect(undated).toBe(1)
  })

  it('a month shows whole weeks, Monday to Sunday', () => {
    const days = calendarDays(new Map(), '2026-10-27', 'month')
    expect(days[0].day).toBe('2026-09-28') // 1 Oct 2026 is a Thursday
    expect(days.length % 7).toBe(0)
    expect(days.at(-1)?.day).toBe('2026-11-01')
    expect(days.filter((d) => d.inPeriod)).toHaveLength(31)
    // February 2027 starts on a Monday and fits four weeks.
    expect(calendarDays(new Map(), '2027-02-10', 'month')).toHaveLength(28)
  })

  it('a week shows seven days from Monday', () => {
    const days = calendarDays(new Map(), '2026-10-28', 'week')
    expect(days.map((d) => d.day)).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ])
  })

  it('moves by months and weeks, keeping short months in range', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15')
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15')
    expect(shift('2026-10-27', 'week', 1)).toBe('2026-11-03')
    expect(shift('2026-10-27', 'month', -1)).toBe('2026-09-27')
  })
})
