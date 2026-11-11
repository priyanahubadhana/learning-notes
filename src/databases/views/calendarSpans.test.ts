import { describe, expect, it } from 'vitest'
import type { Page } from '../../core/types'
import { addDays } from './calendarData'
import type { ResolvedRow } from '../databaseQuery'
import {
  addYears,
  dayCounts,
  MAX_SPAN_DAYS,
  rowSpans,
  weekLanes,
  yearBounds,
  yearMonths,
} from './calendarSpans'

let n = 0
const row = (start: string | null, end?: string | null): ResolvedRow => ({
  page: { id: `p${String(++n).padStart(3, '0')}`, title: `R${n}` } as Page,
  values: {
    from: start ? { date: start } : null,
    to: end ? { date: end } : null,
  },
  links: {},
})

describe('row spans', () => {
  it('a row with only a start is one day; a missing or earlier end too', () => {
    const { spans, undated } = rowSpans(
      [row('2026-10-27'), row('2026-10-27', '2026-10-20'), row(null)],
      'from',
      'to',
    )
    expect(spans.map((s) => [s.start, s.end])).toEqual([
      ['2026-10-27', '2026-10-27'],
      ['2026-10-27', '2026-10-27'],
    ])
    expect(undated).toBe(1)
  })

  it('an end column makes a multi-day span, cut at a year', () => {
    const { spans } = rowSpans(
      [row('2026-10-27', '2026-10-30'), row('2026-01-01', '2030-01-01')],
      'from',
      'to',
    )
    expect(spans[0].end).toBe('2026-10-30')
    expect(spans[1].end).toBe('2027-01-01') // 366 days, first day included
    expect(MAX_SPAN_DAYS).toBe(366)
  })

  it('without an end column the end value is ignored', () => {
    const { spans } = rowSpans([row('2026-10-27', '2026-10-30')], 'from', null)
    expect(spans[0].end).toBe('2026-10-27')
  })
})

describe('week lanes', () => {
  // Week of Mon 26 Oct to Sun 1 Nov 2026.
  const week = '2026-10-26'

  it('a span keeps its lane on every day and labels on its first day', () => {
    const { spans } = rowSpans(
      [row('2026-10-27', '2026-10-29'), row('2026-10-28')],
      'from',
      'to',
    )
    const days = weekLanes(spans, week, 3)
    expect(days).toHaveLength(7)
    const lane0 = days.map((d) => d.slots[0]?.span.row.page.id ?? null)
    expect(lane0[1]).toBe(lane0[2])
    expect(lane0[2]).toBe(lane0[3])
    expect(days[1].slots[0]?.showLabel).toBe(true)
    expect(days[2].slots[0]?.showLabel).toBe(false)
    expect(days[3].slots[0]?.endsHere).toBe(true)
    // The one-day row sits under it on the 28th.
    expect(days[2].slots[1]?.span.start).toBe('2026-10-28')
    expect(days[0].slots).toHaveLength(2) // same lane count on all days
  })

  it('a span from the week before is labelled on Monday', () => {
    const { spans } = rowSpans([row('2026-10-22', '2026-10-27')], 'from', 'to')
    const days = weekLanes(spans, week, 3)
    expect(days[0].slots[0]).toMatchObject({
      startsHere: false,
      showLabel: true,
    })
    expect(days[1].slots[0]?.endsHere).toBe(true)
    expect(days[2].slots[0]).toBeNull()
  })

  it('what does not fit in the lanes is counted as hidden', () => {
    const { spans } = rowSpans(
      Array.from({ length: 5 }, () => row('2026-10-30')),
      'from',
      'to',
    )
    const day = weekLanes(spans, week, 3)[4]
    expect(day.slots.filter(Boolean)).toHaveLength(3)
    expect(day.hidden).toBe(2)
    expect(day.all).toHaveLength(5)
  })

  it('a span at the end of a month crosses into the next without gaps', () => {
    const { spans } = rowSpans([row('2026-10-30', '2026-11-03')], 'from', 'to')
    const w1 = weekLanes(spans, '2026-10-26', 3)
    const w2 = weekLanes(spans, '2026-11-02', 3)
    expect(w1[6].slots[0]?.endsHere).toBe(false)
    expect(w2[0].slots[0]?.showLabel).toBe(true)
    expect(w2[1].slots[0]?.endsHere).toBe(true)
  })
})

describe('year', () => {
  it('has 12 months, with Monday-first leading blanks', () => {
    const months = yearMonths(2026, new Map())
    expect(months).toHaveLength(12)
    expect(months[0]).toMatchObject({ month: '2026-01-01', lead: 3 }) // Thu
    expect(months[0].days).toHaveLength(31)
    expect(months[1].days).toHaveLength(28)
    expect(yearMonths(2028, new Map())[1].days).toHaveLength(29)
  })

  it('counts rows per day, a span on each of its days, clipped to the year', () => {
    const { spans } = rowSpans(
      [
        row('2026-03-02'),
        row('2026-03-02', '2026-03-03'),
        row('2025-12-30', '2026-01-02'),
      ],
      'from',
      'to',
    )
    const [first, last] = yearBounds(2026)
    const counts = dayCounts(spans, first, last)
    expect(counts.get('2026-03-02')).toBe(2)
    expect(counts.get('2026-03-03')).toBe(1)
    expect(counts.get('2026-01-02')).toBe(1)
    expect(counts.has('2025-12-31')).toBe(false)
    const months = yearMonths(2026, counts)
    expect(months[2].days[1].count).toBe(2)
  })

  it('moves by years and keeps 29 Feb valid', () => {
    expect(addYears('2028-02-29', 1)).toBe('2029-02-28')
    expect(addYears('2026-11-11', -1)).toBe('2025-11-11')
  })
})

describe('big databases', () => {
  it('lays out a month and a year of 10,000 rows quickly', () => {
    const rows = Array.from({ length: 10_000 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 0, 1 + (i % 400)))
      const end = new Date(d.getTime() + (i % 5) * 86_400_000)
      return row(d.toISOString().slice(0, 10), end.toISOString().slice(0, 10))
    })
    const began = performance.now()
    const { spans } = rowSpans(rows, 'from', 'to')
    const weeks = Array.from({ length: 6 }, (_, w) =>
      weekLanes(spans, addDays('2026-09-28', 7 * w), 3),
    )
    const [first, last] = yearBounds(2026)
    const counts = dayCounts(spans, first, last)
    expect(performance.now() - began).toBeLessThan(1500)
    expect(weeks.flat()).toHaveLength(42)
    // Each day draws at most 3 rows however many it holds.
    expect(weeks.flat().every((d) => d.slots.length <= 3)).toBe(true)
    expect(counts.size).toBeGreaterThan(300)
  })
})
