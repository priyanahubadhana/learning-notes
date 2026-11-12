import { describe, expect, it } from 'vitest'
import {
  addDays,
  daysInMonth,
  formatRange,
  isLeapYear,
  isValidRange,
  parseYmd,
  rangeFor,
  todayYmd,
} from './timeRange'

const r = (kind: Parameters<typeof rangeFor>[0]['kind'], today: string, ws: 0 | 1 = 1) =>
  rangeFor({ kind }, today, ws)

describe('timeRange: every preset', () => {
  // Thursday 12 Nov 2026
  const today = '2026-11-12'
  it('today', () => expect(r('day', today)).toEqual({ from: today, to: today }))
  it('this week (Monday start)', () =>
    expect(r('week', today)).toEqual({ from: '2026-11-09', to: '2026-11-15' }))
  it('this week (Sunday start)', () =>
    expect(r('week', today, 0)).toEqual({ from: '2026-11-08', to: '2026-11-14' }))
  it('this month', () =>
    expect(r('month', today)).toEqual({ from: '2026-11-01', to: '2026-11-30' }))
  it('last month', () =>
    expect(r('lastmonth', today)).toEqual({ from: '2026-10-01', to: '2026-10-31' }))
  it('this quarter', () =>
    expect(r('quarter', today)).toEqual({ from: '2026-10-01', to: '2026-12-31' }))
  it('this year', () =>
    expect(r('year', today)).toEqual({ from: '2026-01-01', to: '2026-12-31' }))
  it('last 7 days includes today', () =>
    expect(r('last7', today)).toEqual({ from: '2026-11-06', to: today }))
  it('last 30 days', () =>
    expect(r('last30', today)).toEqual({ from: '2026-10-14', to: today }))
  it('last 4 weeks is 28 days', () =>
    expect(r('last4w', today)).toEqual({ from: '2026-10-16', to: today }))
  it('custom keeps its dates', () =>
    expect(
      rangeFor({ kind: 'custom', from: '2026-01-05', to: '2026-02-01' }, today),
    ).toEqual({ from: '2026-01-05', to: '2026-02-01' }))
})

describe('timeRange: week start edges', () => {
  it('a Monday starts its own week (Monday start)', () =>
    expect(r('week', '2026-11-09')).toEqual({ from: '2026-11-09', to: '2026-11-15' }))
  it('a Sunday ends the week (Monday start)', () =>
    expect(r('week', '2026-11-15')).toEqual({ from: '2026-11-09', to: '2026-11-15' }))
  it('a Sunday starts its own week (Sunday start)', () =>
    expect(r('week', '2026-11-15', 0)).toEqual({ from: '2026-11-15', to: '2026-11-21' }))
  it('a week can cross a year end', () =>
    expect(r('week', '2026-12-31')).toEqual({ from: '2026-12-28', to: '2027-01-03' }))
})

describe('timeRange: month ends and leap years', () => {
  it('knows which years are leap', () => {
    expect([2024, 2000, 2026, 1900].map(isLeapYear)).toEqual([true, true, false, false])
  })
  it('days in each month', () => {
    expect([1, 2, 4, 12].map((m) => daysInMonth(2026, m))).toEqual([31, 28, 30, 31])
    expect(daysInMonth(2024, 2)).toBe(29)
  })
  it('this month in a leap February', () =>
    expect(r('month', '2024-02-10')).toEqual({ from: '2024-02-01', to: '2024-02-29' }))
  it('this month in a normal February', () =>
    expect(r('month', '2026-02-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' }))
  it('last month in January goes to December of the year before', () =>
    expect(r('lastmonth', '2026-01-15')).toEqual({ from: '2025-12-01', to: '2025-12-31' }))
  it('last month from March reaches a leap day', () =>
    expect(r('lastmonth', '2024-03-31')).toEqual({ from: '2024-02-01', to: '2024-02-29' }))
  it('quarter ends: Q1 and Q2', () => {
    expect(r('quarter', '2026-03-31')).toEqual({ from: '2026-01-01', to: '2026-03-31' })
    expect(r('quarter', '2026-04-01')).toEqual({ from: '2026-04-01', to: '2026-06-30' })
  })
  it('last 7 days across a leap day', () =>
    expect(r('last7', '2024-03-02')).toEqual({ from: '2024-02-25', to: '2024-03-02' }))
  it('adding days is not moved by daylight saving', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31')
  })
})

describe('timeRange: checks and words', () => {
  it('parses only real dates', () => {
    expect(parseYmd('2026-02-30')).toBeNull()
    expect(parseYmd('2026-2-3')).toBeNull()
    expect(parseYmd('2024-02-29')).toEqual({ y: 2024, m: 2, d: 29 })
  })
  it('validates a range', () => {
    expect(isValidRange('2026-11-01', '2026-11-01')).toBe(true)
    expect(isValidRange('2026-11-02', '2026-11-01')).toBe(false)
    expect(isValidRange('', '2026-11-01')).toBe(false)
  })
  it('today in local time', () =>
    expect(todayYmd(new Date(2026, 10, 12, 23, 59))).toBe('2026-11-12'))
  it('prints the range line', () => {
    expect(formatRange({ from: '2026-11-12', to: '2026-11-18' }, 'en-GB')).toBe(
      '12-18 Nov 2026',
    )
    expect(formatRange({ from: '2026-10-28', to: '2026-11-03' }, 'en-GB')).toBe(
      '28 Oct - 3 Nov 2026',
    )
    expect(formatRange({ from: '2026-12-30', to: '2027-01-02' }, 'en-GB')).toBe(
      '30 Dec 2026 - 2 Jan 2027',
    )
    expect(formatRange({ from: '2026-11-12', to: '2026-11-12' }, 'en-GB')).toBe(
      '12 Nov 2026',
    )
  })
})
