import { describe, expect, it } from 'vitest'
import type { Annotation } from '../../core/types'
import { cleanPrefs } from './libraryPrefs'
import { NO_FILTER, filterKnowledge, isFiltered } from './knowledgeFilter'

const DAY = 86_400_000
const NOW = 100 * DAY
const a = (id: string, o: Partial<Annotation>): Annotation =>
  ({
    id,
    pageId: 'p1',
    kind: 'highlight',
    createdAt: NOW,
    quote: { exact: 'quote ' + id, prefix: '', suffix: '' },
    ...o,
  }) as Annotation

const rows = [
  a('1', { colour: 'yellow' }),
  a('2', {
    kind: 'note',
    note: 'Habits matter',
    quote: undefined,
    createdAt: NOW - 3 * DAY,
  }),
  a('3', {
    kind: 'bookmark',
    pageId: 'p2',
    quote: undefined,
    createdAt: NOW - 20 * DAY,
  }),
  a('4', { pageId: 'p2', colour: 'blue', createdAt: NOW - 60 * DAY }),
]
const ids = (r: Annotation[]) => r.map((x) => x.id)

describe('Knowledge filters', () => {
  it('filters by type', () => {
    expect(ids(filterKnowledge(rows, { ...NO_FILTER, type: 'note' }))).toEqual([
      '2',
    ])
    expect(
      ids(filterKnowledge(rows, { ...NO_FILTER, type: 'bookmark' })),
    ).toEqual(['3'])
  })
  it('filters by date', () => {
    const o = { now: NOW }
    expect(
      ids(filterKnowledge(rows, { ...NO_FILTER, date: 'week' }, o)),
    ).toEqual(['1', '2'])
    expect(
      ids(filterKnowledge(rows, { ...NO_FILTER, date: 'month' }, o)),
    ).toEqual(['1', '2', '3'])
  })
  it('filters by the tag of the book', () => {
    const pageTags = new Map([['p2', ['t1']]])
    expect(
      ids(filterKnowledge(rows, { ...NO_FILTER, tagId: 't1' }, { pageTags })),
    ).toEqual(['3', '4'])
  })
  it('combines book, colour and search; knows when it narrows', () => {
    expect(
      ids(filterKnowledge(rows, { ...NO_FILTER, book: 'p2', colour: 'blue' })),
    ).toEqual(['4'])
    expect(ids(filterKnowledge(rows, NO_FILTER, { search: 'HABITS' }))).toEqual(
      ['2'],
    )
    expect(isFiltered(NO_FILTER)).toBe(false)
    expect(isFiltered({ ...NO_FILTER, date: 'week' })).toBe(true)
  })
  it('keeps saved filters and the daily count when they are valid, drops bad ones', () => {
    const p = cleanPrefs({
      dailyCount: 10,
      saved: [
        {
          id: 's1',
          name: 'Psych',
          type: 'note',
          date: 'month',
          book: '',
          colour: '',
          tagId: 't',
        },
        { id: '', name: 'bad' },
        { id: 's2', name: 'x', type: 'zzz', date: 'zzz' },
      ],
    })
    expect(p.dailyCount).toBe(10)
    expect(p.saved.map((s) => s.id)).toEqual(['s1', 's2'])
    expect(p.saved[1]).toMatchObject({ type: 'all', date: 'any' })
    expect(cleanPrefs({ dailyCount: 7 }).dailyCount).toBe(5)
  })
})
