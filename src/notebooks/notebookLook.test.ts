import { describe, expect, it } from 'vitest'
import {
  COVER_COLOURS,
  dayKind,
  homeTabList,
  RECENT_NOTEBOOKS,
  lastOpened,
  nextColour,
  notebookColour,
  shelfOrder,
  shortLabel,
  visibleRows,
} from './notebookLook'

describe('notebookColour', () => {
  it('uses the notebook colour, else a stable one from the id', () => {
    expect(notebookColour({ id: 'a', colour: '#112233' })).toBe('#112233')
    const a = notebookColour({ id: 'abc' })
    expect(COVER_COLOURS).toContain(a)
    expect(notebookColour({ id: 'abc' })).toBe(a)
    expect(COVER_COLOURS).toContain(notebookColour({ id: 'x', colour: 'red' }))
  })
  it('steps through the list and wraps', () => {
    expect(nextColour(COVER_COLOURS[0])).toBe(COVER_COLOURS[1])
    expect(nextColour(COVER_COLOURS[COVER_COLOURS.length - 1])).toBe(
      COVER_COLOURS[0],
    )
  })
})

describe('shortLabel', () => {
  it('takes initials of two words, or the start of one', () => {
    expect(shortLabel('Anatomy')).toBe('Ana')
    expect(shortLabel('claude and AI course')).toBe('CA')
    expect(shortLabel('  ')).toBe('·')
  })
})

describe('shelfOrder', () => {
  it('puts pinned notebooks first and keeps the order', () => {
    const list = [
      { id: 1 },
      { id: 2, starred: true as const },
      { id: 3 },
      { id: 4, starred: true as const },
    ]
    expect(shelfOrder(list).map((n) => n.id)).toEqual([2, 4, 1, 3])
  })
})

describe('lastOpened and dayKind', () => {
  it('falls back to the last change', () => {
    expect(lastOpened({ id: 'a', updatedAt: 5 }, {})).toBe(5)
    expect(lastOpened({ id: 'a', updatedAt: 5 }, { a: 9 })).toBe(9)
  })
  it('names today and yesterday', () => {
    const now = new Date(2026, 10, 9, 15).getTime()
    expect(dayKind(new Date(2026, 10, 9, 1).getTime(), now)).toBe('today')
    expect(dayKind(new Date(2026, 10, 8, 23).getTime(), now)).toBe('yesterday')
    expect(dayKind(new Date(2026, 10, 1).getTime(), now)).toBe('date')
  })
})

describe('visibleRows', () => {
  it('draws only rows near the screen, even for 500 notebooks', () => {
    const { from, to } = visibleRows(0, 800, 200, 170)
    expect(from).toBe(0)
    expect(to).toBeLessThan(12)
    const mid = visibleRows(10_000, 800, 200, 170)
    expect(mid.from).toBeGreaterThan(40)
    expect(mid.to - mid.from).toBeLessThan(14)
    expect(visibleRows(1e9, 800, 200, 170).to).toBe(170)
  })
})

describe('homeTabList', () => {
  const nb = (id: string, updatedAt: number, starred?: true) => ({
    id,
    updatedAt,
    starred,
  })
  const list = [nb('a', 10), nb('b', 20, true), nb('c', 30), nb('d', 5, true)]
  it('All keeps pinned first', () => {
    expect(homeTabList(list, 'all', {}).map((n) => n.id)).toEqual([
      'b',
      'd',
      'a',
      'c',
    ])
  })
  it('Starred lists only pinned notebooks, in the sidebar order', () => {
    expect(homeTabList(list, 'starred', {}).map((n) => n.id)).toEqual([
      'b',
      'd',
    ])
    expect(homeTabList([nb('a', 1)], 'starred', {})).toEqual([])
  })
  it('Recent: last opened here first, else last changed', () => {
    expect(homeTabList(list, 'recent', { a: 99 }).map((n) => n.id)).toEqual([
      'a',
      'c',
      'b',
      'd',
    ])
  })
  it('Recent is cut to the most recent ones', () => {
    const many = Array.from({ length: RECENT_NOTEBOOKS + 5 }, (_, i) =>
      nb('n' + i, i),
    )
    const recent = homeTabList(many, 'recent', {})
    expect(recent).toHaveLength(RECENT_NOTEBOOKS)
    expect(recent[0].id).toBe('n' + (RECENT_NOTEBOOKS + 4))
  })
})
