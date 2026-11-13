/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  EMPTY_FILTER,
  chipsOf,
  clearAll,
  clearChip,
  filterWorkflows,
  addView,
  loadViews,
  loadWorkflows,
  removeView,
  saveViews,
  sameFilter,
  noteRun,
  saveWorkflows,
  type Workflow,
} from './workflowList'

const wf = (o: Partial<Workflow> & { id: string }): Workflow => ({
  name: o.id,
  tagIds: [],
  forType: '',
  rating: 0,
  uses: 0,
  lastRun: 0,
  plan: { steps: [] },
  ...o,
})
const list: Workflow[] = [
  wf({
    id: 'Podcast',
    tagIds: ['a', 'b'],
    forType: 'audio',
    rating: 5,
    uses: 9,
    lastRun: 3,
  }),
  wf({
    id: 'Article',
    tagIds: ['a'],
    forType: 'article',
    rating: 3,
    uses: 2,
    lastRun: 9,
  }),
  wf({
    id: 'Book',
    tagIds: ['b'],
    forType: 'book',
    rating: 4,
    uses: 5,
    lastRun: 1,
  }),
]
const names = (f = EMPTY_FILTER) => filterWorkflows(list, f).map((w) => w.id)

beforeEach(() => localStorage.clear())

describe('Workflows filter (A4, SW-1 to SW-4)', () => {
  it('shows all, sorted by rating by default', () => {
    expect(names()).toEqual(['Podcast', 'Book', 'Article'])
  })
  it('tags: Any keeps a workflow with one of them, All needs every one', () => {
    expect(names({ ...EMPTY_FILTER, tagIds: ['a', 'b'] })).toEqual([
      'Podcast',
      'Book',
      'Article',
    ])
    expect(
      names({ ...EMPTY_FILTER, tagIds: ['a', 'b'], tagMatch: 'all' }),
    ).toEqual(['Podcast'])
  })
  it('More filters: For, minimum rating, times used', () => {
    expect(names({ ...EMPTY_FILTER, forTypes: ['book', 'audio'] })).toEqual([
      'Podcast',
      'Book',
    ])
    expect(names({ ...EMPTY_FILTER, minRating: 4 })).toEqual([
      'Podcast',
      'Book',
    ])
    expect(names({ ...EMPTY_FILTER, minUses: 5 })).toEqual(['Podcast', 'Book'])
  })
  it('sorts by most used, name and recently run', () => {
    expect(names({ ...EMPTY_FILTER, sort: 'used' })).toEqual([
      'Podcast',
      'Book',
      'Article',
    ])
    expect(names({ ...EMPTY_FILTER, sort: 'name' })).toEqual([
      'Article',
      'Book',
      'Podcast',
    ])
    expect(names({ ...EMPTY_FILTER, sort: 'recent' })).toEqual([
      'Article',
      'Podcast',
      'Book',
    ])
  })
  it('the search box narrows by name', () => {
    expect(names({ ...EMPTY_FILTER, q: 'pod' })).toEqual(['Podcast'])
  })
  it('one chip per active filter; removing one leaves the rest; Clear all keeps the sort', () => {
    expect(chipsOf(EMPTY_FILTER)).toEqual([])
    const f = {
      ...EMPTY_FILTER,
      q: 'x',
      tagIds: ['a', 'b'],
      tagMatch: 'all' as const,
      forTypes: ['book'],
      minRating: 4,
      minUses: 2,
      sort: 'name' as const,
    }
    const keys = chipsOf(f).map((c) => `${c.kind}:${c.value ?? ''}`)
    expect(keys).toEqual([
      'q:',
      'tag:a',
      'tag:b',
      'all:',
      'for:book',
      'rating:',
      'uses:',
    ])
    const g = clearChip(f, { kind: 'tag', value: 'a' })
    expect(g.tagIds).toEqual(['b'])
    expect(g.minRating).toBe(4)
    expect(clearChip(f, { kind: 'rating' }).minRating).toBe(0)
    expect(chipsOf(clearAll(f))).toEqual([])
    expect(clearAll(f).sort).toBe('name')
  })
})

describe('Workflows keep (SW-5)', () => {
  it('saves and loads, and a run counts one use and the time', () => {
    saveWorkflows(list)
    expect(loadWorkflows().map((w) => w.id)).toEqual([
      'Podcast',
      'Article',
      'Book',
    ])
    const after = noteRun(list, 'Book', 1000)
    expect(after.find((w) => w.id === 'Book')).toMatchObject({
      uses: 6,
      lastRun: 1000,
    })
    expect(after.find((w) => w.id === 'Article')).toEqual(list[1])
  })
  it('bad stored data gives an empty list, never a crash', () => {
    localStorage.setItem('learning-notes:aifw.workflows', '{"x":1}')
    expect(loadWorkflows()).toEqual([])
  })
})

describe('Workflows saved views (A4)', () => {
  const f = { ...EMPTY_FILTER, minRating: 4, tagIds: ['a'] }
  it('a view keeps the whole filter and sort, with a trimmed name', () => {
    const v = addView([], '  Best audio ', { ...f, sort: 'used' }, 'v1')
    expect(v).toEqual([
      { id: 'v1', name: 'Best audio', filter: { ...f, sort: 'used' } },
    ])
  })
  it('a blank name or a name already used makes no view', () => {
    expect(addView([], '   ', f, 'v1')).toEqual([])
    const one = addView([], 'Best', f, 'v1')
    expect(addView(one, 'best', f, 'v2')).toEqual(one)
  })
  it('sameFilter follows the result, not the order of tags', () => {
    expect(sameFilter(f, { ...f })).toBe(true)
    expect(sameFilter(f, { ...f, minRating: 3 })).toBe(false)
    expect(
      sameFilter({ ...f, tagIds: ['a', 'b'] }, { ...f, tagIds: ['b', 'a'] }),
    ).toBe(true)
  })
  it('removes one view and keeps the rest', () => {
    const two = addView(addView([], 'A', f, 'v1'), 'B', EMPTY_FILTER, 'v2')
    expect(removeView(two, 'v1').map((v) => v.id)).toEqual(['v2'])
  })
  it('saves and loads; bad stored data gives none', () => {
    const one = addView([], 'A', f, 'v1')
    saveViews(one)
    expect(loadViews()).toEqual(one)
    localStorage.setItem('learning-notes:aifw.workflowViews', '[{"id":1}]')
    expect(loadViews()).toEqual([])
  })
})
