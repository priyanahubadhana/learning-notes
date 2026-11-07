import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addBookmark,
  addReadingSeconds,
  clearResume,
  getBookmarks,
  getResume,
  goalDays,
  minutesRead,
  readGoalMinutes,
  readStreakData,
  removeBookmark,
  saveResume,
  streakDays,
  writeGoalMinutes,
} from './readingMarks'

beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  })
})

describe('resume', () => {
  it('remembers where you stopped, per page', () => {
    saveResume('p1', { blockId: 'b1', progress: 0.4, at: 1 })
    saveResume('p2', { blockId: 'b9', progress: 0.9, at: 2 })
    expect(getResume('p1')?.blockId).toBe('b1')
    expect(getResume('p2')?.progress).toBe(0.9)
    clearResume('p1')
    expect(getResume('p1')).toBeUndefined()
  })

  it('forgets the pages read longest ago past 400', () => {
    for (let i = 0; i < 405; i++) {
      saveResume(`p${i}`, { blockId: 'b', progress: 0, at: i })
    }
    expect(getResume('p0')).toBeUndefined()
    expect(getResume('p404')).toBeDefined()
  })
})

describe('bookmarks', () => {
  it('adds, lists and removes, one per block', () => {
    addBookmark('p', { blockId: 'b1', label: 'Intro', progress: 0.1 }, 10)
    addBookmark('p', { blockId: 'b1', label: 'Again', progress: 0.1 }, 11)
    const list = addBookmark(
      'p',
      { blockId: 'b2', label: 'End', progress: 0.9 },
      12,
    )
    expect(list.map((b) => b.label)).toEqual(['Intro', 'End'])
    expect(getBookmarks('other')).toEqual([])
    expect(removeBookmark('p', list[0].id).map((b) => b.label)).toEqual(['End'])
  })
})

describe('reading goal', () => {
  const day = (d: string) => new Date(`${d}T12:00:00`)

  it('keeps the goal, counts minutes today and goal days of the week', () => {
    expect(readGoalMinutes()).toBe(0)
    writeGoalMinutes(10)
    writeGoalMinutes(7) // not on offer: ignored
    expect(readGoalMinutes()).toBe(10)
    addReadingSeconds(11 * 60, day('2026-11-05'))
    addReadingSeconds(5 * 60 + 30, day('2026-11-06'))
    expect(minutesRead(readStreakData(), day('2026-11-06'))).toBe(5)
    expect(goalDays(10, readStreakData(), day('2026-11-06'))).toBe(1)
    expect(goalDays(0, readStreakData(), day('2026-11-06'))).toBe(0)
  })
})

describe('reading streak', () => {
  const day = (d: string) => new Date(`${d}T12:00:00`)

  it('counts days in a row with at least a minute of reading', () => {
    addReadingSeconds(120, day('2026-11-03'))
    addReadingSeconds(30, day('2026-11-04'))
    addReadingSeconds(30, day('2026-11-04'))
    addReadingSeconds(300, day('2026-11-05'))
    expect(streakDays(readStreakData(), day('2026-11-05'))).toBe(3)
  })

  it('keeps the streak until the day is over, then drops it', () => {
    addReadingSeconds(100, day('2026-11-03'))
    addReadingSeconds(100, day('2026-11-04'))
    expect(streakDays(readStreakData(), day('2026-11-05'))).toBe(2)
    expect(streakDays(readStreakData(), day('2026-11-06'))).toBe(0)
  })

  it('under a minute does not count', () => {
    addReadingSeconds(20, day('2026-11-05'))
    expect(streakDays(readStreakData(), day('2026-11-05'))).toBe(0)
  })
})
