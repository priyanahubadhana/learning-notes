import { describe, expect, it } from 'vitest'
import { addStudyDays, studyDayEnd, studyDayStart } from './time'

// Dates are built in local time, so these tests pass in any time zone.
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime()

describe('study days', () => {
  it('starts at 4 am by default', () => {
    expect(studyDayStart(at(25, 10))).toBe(at(25, 4))
  })

  it('counts late-night study as the previous day', () => {
    expect(studyDayStart(at(26, 1, 30))).toBe(at(25, 4))
    expect(studyDayStart(at(26, 4))).toBe(at(26, 4))
  })

  it('respects a custom rollover hour', () => {
    expect(studyDayStart(at(25, 0, 30), 0)).toBe(at(25, 0))
    expect(studyDayStart(at(25, 5), 6)).toBe(at(24, 6))
  })

  it('adds whole calendar days', () => {
    expect(addStudyDays(at(25, 10), 3)).toBe(at(28, 4))
    expect(studyDayEnd(at(25, 23))).toBe(at(26, 4))
  })

  it('crosses month ends', () => {
    expect(addStudyDays(at(30, 12), 3)).toBe(new Date(2026, 10, 2, 4).getTime())
  })
})
