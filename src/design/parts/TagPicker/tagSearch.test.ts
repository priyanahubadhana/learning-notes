import { describe, expect, it } from 'vitest'
import {
  browseTree,
  editDistance,
  nearDuplicate,
  pushRecent,
  scoreTag,
  searchTags,
  SCORE,
  triState,
  withPaths,
  type TagItem,
} from './tagSearch'

const T = (id: string, name: string, parentId: string | null, count = 0): TagItem => ({
  id,
  name,
  parentId,
  count,
})
const tags = withPaths([
  T('h', 'Health', null, 1),
  T('hab', 'habits', 'h', 9),
  T('rou', 'routines', 'hab', 4),
  T('med', 'medicine', null, 2),
  T('card', 'cardio', 'med', 3),
  T('solo', 'inbox', null, 0),
])
const get = (id: string) => tags.find((t) => t.id === id)!

describe('tag search scoring', () => {
  it('scores exact 100, prefix 80, contains 60, path 40, subsequence 30', () => {
    expect(scoreTag('habits', get('hab'))).toBe(SCORE.exact)
    expect(scoreTag('hab', get('hab'))).toBe(SCORE.prefix)
    expect(scoreTag('bit', get('hab'))).toBe(SCORE.contains)
    expect(scoreTag('health', get('hab'))).toBe(SCORE.path)
    expect(scoreTag('hbts', get('hab'))).toBe(SCORE.subsequence)
    expect(scoreTag('zzz', get('hab'))).toBe(0)
  })
  it('ignores case, accents and a leading #', () => {
    expect(scoreTag('#HABITS', get('hab'))).toBe(100)
    expect(scoreTag('cárdio', get('card'))).toBe(100)
  })
  it('empty text scores nothing', () => expect(scoreTag('  ', get('hab'))).toBe(0))
  it('sorts by score, then by use', () => {
    const r = searchTags('h', tags)
    expect(r[0].tag.id).toBe('hab') // prefix, used 9, beats Health (prefix, used 1)
    expect(r[1].tag.id).toBe('h')
  })
  it('finds a tag by its path', () => {
    expect(searchTags('medicine', tags).map((m) => m.tag.id)).toEqual(['med', 'card'])
  })
  it('builds the path from the top', () => {
    expect(get('rou').path).toEqual(['Health', 'habits', 'routines'])
  })
  it('survives a parent loop', () => {
    const loop = withPaths([T('a', 'a', 'b'), T('b', 'b', 'a')])
    expect(loop[0].path.length).toBe(2)
  })
})

describe('near-duplicate check', () => {
  const list = [
    { id: '1', name: 'habit' },
    { id: '2', name: 'medicine' },
    { id: '3', name: 'photosynthesis' },
  ]
  it('catches plural versus singular', () => {
    expect(nearDuplicate('habits', list)?.id).toBe('1')
    expect(nearDuplicate('medicines', list)?.id).toBe('2')
  })
  it('catches one slip in a short word', () => {
    expect(nearDuplicate('habbit', list)?.id).toBe('1')
  })
  it('allows two slips in a long word (over 6 letters)', () => {
    expect(nearDuplicate('medicene', list)?.id).toBe('2')
    expect(nearDuplicate('photosynthsis', list)?.id).toBe('3')
  })
  it('a short word does not allow two slips', () => {
    expect(nearDuplicate('hxbxt', list)).toBeNull()
  })
  it('an exact tag is not a duplicate', () => {
    expect(nearDuplicate('Habit', list)).toBeNull()
    expect(nearDuplicate('#habit', list)).toBeNull()
  })
  it('nothing close gives null', () => {
    expect(nearDuplicate('chemistry', list)).toBeNull()
    expect(nearDuplicate('', list)).toBeNull()
  })
  it('edit distance', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3)
    expect(editDistance('a', 'a')).toBe(0)
  })
})

describe('tri-state, browse tree, recent', () => {
  it('tri-state for bulk items', () => {
    expect(triState('x', [['x'], ['x', 'y']])).toBe('all')
    expect(triState('x', [['x'], ['y']])).toBe('some')
    expect(triState('x', [['y'], ['y']])).toBe('none')
    expect(triState('x', [])).toBe('none')
  })
  it('puts tags with sub-tags in categories, sorted by use', () => {
    const { categories, uncategorised } = browseTree(tags)
    expect(categories.map((c) => c.category.id)).toEqual(['h', 'med'])
    expect(categories[0].tags.map((t) => t.id)).toEqual(['hab', 'rou'])
    expect(categories[0].total).toBe(1 + 9 + 4)
    expect(uncategorised.map((t) => t.id)).toEqual(['solo'])
  })
  it('recent keeps 6, newest first, no repeats', () => {
    let r: string[] = []
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'c']) r = pushRecent(r, id)
    expect(r).toEqual(['c', 'g', 'f', 'e', 'd', 'b'])
  })
})
