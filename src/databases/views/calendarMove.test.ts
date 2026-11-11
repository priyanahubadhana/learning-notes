import { describe, expect, it } from 'vitest'
import { localDay } from '../formula/formulaValue'
import { cellChanges, dayDelta, movedDate, shiftCells } from './calendarMove'

describe('moving dates', () => {
  it('counts whole days between two days, over months and leap days', () => {
    expect(dayDelta('2026-10-27', '2026-10-27')).toBe(0)
    expect(dayDelta('2026-10-27', '2026-11-02')).toBe(6)
    expect(dayDelta('2026-11-02', '2026-10-27')).toBe(-6)
    expect(dayDelta('2028-02-28', '2028-03-01')).toBe(2)
    expect(dayDelta('2026-12-31', '2027-01-01')).toBe(1)
  })

  it('moves a plain day by calendar days, whatever the time zone', () => {
    expect(movedDate('2026-10-31', 1)).toBe('2026-11-01')
    expect(movedDate('2026-03-01', -1)).toBe('2026-02-28')
    expect(movedDate('2028-03-01', -1)).toBe('2028-02-29')
    // Clock-change weekends are plain days too.
    expect(movedDate('2026-03-28', 1)).toBe('2026-03-29')
    expect(movedDate('2026-10-24', 1)).toBe('2026-10-25')
    expect(movedDate('2026-11-01', 7)).toBe('2026-11-08')
  })

  it('refuses a result outside the years the app can store', () => {
    expect(movedDate('9999-12-31', 1)).toBeNull()
    expect(movedDate('1000-01-01', -1)).toBeNull()
  })

  it('moves a moment to the new local day and keeps the local clock time', () => {
    const from = new Date(2026, 9, 27, 14, 30, 5, 0) // local
    for (const delta of [-40, -1, 1, 7, 200]) {
      const moved = movedDate(from.toISOString(), delta)!
      const m = new Date(moved)
      const expected = new Date(2026, 9, 27 + delta, 14, 30, 5, 0)
      expect(localDay(m.getTime())).toBe(localDay(expected.getTime()))
      expect([m.getHours(), m.getMinutes(), m.getSeconds()]).toEqual([
        expected.getHours(),
        expected.getMinutes(),
        expected.getSeconds(),
      ])
    }
  })

  it('a moment just after local midnight stays on the right day', () => {
    const from = new Date(2026, 5, 10, 0, 5)
    const moved = new Date(movedDate(from.toISOString(), 1)!)
    expect(localDay(moved.getTime())).toBe('2026-06-11')
  })

  it('refuses text that is not a date', () => {
    expect(movedDate('soon', 1)).toBeNull()
  })

  it('shifts start and end together; a missing end stays missing', () => {
    expect(shiftCells({ start: '2026-10-27', end: '2026-10-30' }, 3)).toEqual({
      start: '2026-10-30',
      end: '2026-11-02',
    })
    expect(shiftCells({ start: '2026-10-27', end: null }, -1)).toEqual({
      start: '2026-10-26',
      end: null,
    })
    expect(shiftCells({ start: '9999-12-31', end: null }, 1)).toBeNull()
    expect(shiftCells({ start: '2026-10-27', end: '9999-12-31' }, 1)).toBeNull()
  })

  it('shifting back by the same days gives the original cells', () => {
    const cells = { start: '2026-01-31', end: '2026-02-03' }
    const there = shiftCells(cells, 35)!
    expect(shiftCells(there, -35)).toEqual(cells)
  })

  it('builds the cell changes for the start and, if it has one, the end', () => {
    expect(
      cellChanges('s', 'e', { start: '2026-10-27', end: '2026-10-28' }),
    ).toEqual({ s: '2026-10-27', e: '2026-10-28' })
    expect(cellChanges('s', 'e', { start: '2026-10-27', end: null })).toEqual({
      s: '2026-10-27',
    })
    expect(cellChanges('s', null, { start: '2026-10-27', end: null })).toEqual({
      s: '2026-10-27',
    })
  })
})
