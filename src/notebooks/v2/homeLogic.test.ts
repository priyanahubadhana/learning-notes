import { describe, expect, it } from 'vitest'
import type { Notebook } from '../../core/types'
import {
  CONTINUE_MAX,
  continueList,
  filterByName,
  moveState,
} from './homeLogic'

const nb = (id: string, title = id): Notebook => ({ id, title }) as Notebook

describe('filterByName (NB-P01)', () => {
  const list = [
    nb('1', 'Biology notes'),
    nb('2', 'Café French'),
    nb('3', 'Maths'),
  ]
  const name = (n: Notebook) => n.title
  it('keeps everything for an empty box', () => {
    expect(filterByName(list, '  ', name)).toHaveLength(3)
  })
  it('matches every typed word, ignoring case and accents', () => {
    expect(filterByName(list, 'cafe fr', name).map((n) => n.id)).toEqual(['2'])
    expect(filterByName(list, 'NOTES bio', name).map((n) => n.id)).toEqual([
      '1',
    ])
  })
  it('never treats the text as a pattern', () => {
    expect(filterByName(list, '.*', name)).toEqual([])
    expect(filterByName(list, '(', name)).toEqual([])
  })
  it('no match gives an empty list', () => {
    expect(filterByName(list, 'zzz', name)).toEqual([])
  })
})

describe('continueList (NB-B11)', () => {
  const books = ['a', 'b', 'c', 'd', 'e', 'f'].map((i) => nb(i))
  const opened = { a: 1, b: 6, c: 5, d: 4, e: 3, f: 2 }
  const lastPage = (id: string) => (id === 'c' ? undefined : `p-${id}`)
  it('is the latest opened with a remembered page, at most four', () => {
    const out = continueList(books, opened, lastPage)
    expect(out).toHaveLength(CONTINUE_MAX)
    expect(out.map((c) => c.notebook.id)).toEqual(['b', 'd', 'e', 'f'])
    expect(out[0].pageId).toBe('p-b')
  })
  it('skips never-opened notebooks', () => {
    expect(continueList(books, {}, () => 'p')).toEqual([])
  })
})

describe('moveState (NB-P03)', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  it('knows the neighbours', () => {
    expect(moveState(list, 'a')).toEqual({
      index: 0,
      canMoveUp: false,
      canMoveDown: true,
    })
    expect(moveState(list, 'c').canMoveDown).toBe(false)
    expect(moveState(list, 'zz')).toMatchObject({ index: -1, canMoveUp: false })
  })
})
