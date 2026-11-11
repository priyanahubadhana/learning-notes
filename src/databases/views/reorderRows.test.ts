import { describe, expect, it } from 'vitest'
import type { Page } from '../../core/types'
import type { ResolvedRow } from '../databaseQuery'
import {
  idsByGroup,
  indexOver,
  moveId,
  placeAt,
  placeBack,
} from './reorderRows'
import type { GroupedItem } from './rowGroups'

const row = (id: string): GroupedItem => ({
  kind: 'row',
  row: { page: { id } as Page, values: {}, links: {} } as ResolvedRow,
})

describe('reorder rows', () => {
  const ids = ['a', 'b', 'c', 'd']

  it('drops before the row at the index, or after the last row', () => {
    expect(placeAt(ids, 'a', 2)).toEqual({ before: 'd' }) // b c [a] d
    expect(placeAt(ids, 'a', 3)).toEqual({ after: 'd' })
    expect(placeAt(ids, 'd', 0)).toEqual({ before: 'a' })
    expect(placeAt(ids, 'c', 1)).toEqual({ before: 'b' })
  })

  it('does nothing when the row stays where it is', () => {
    expect(placeAt(ids, 'b', 1)).toBeNull()
    expect(placeAt(ids, 'a', 0)).toBeNull()
    expect(placeAt(ids, 'd', 3)).toBeNull()
    expect(placeAt(['a'], 'a', 0)).toBeNull()
    expect(placeAt(ids, 'zzz', 0)).toBeNull()
  })

  it('clamps an index that is too far', () => {
    expect(placeAt(ids, 'a', 99)).toEqual({ after: 'd' })
    expect(placeAt(ids, 'd', -5)).toEqual({ before: 'a' })
  })

  it('puts a row back where it was', () => {
    expect(placeBack(ids, 'a')).toEqual({ before: 'b' })
    expect(placeBack(ids, 'c')).toEqual({ after: 'b' })
    expect(placeBack(ids, 'd')).toEqual({ after: 'c' })
    expect(placeBack(['a'], 'a')).toBeNull()
  })

  it('a move followed by its undo restores the order', () => {
    for (const moved of ids) {
      for (let to = 0; to < ids.length; to++) {
        const place = placeAt(ids, moved, to)
        const after = moveId(ids, moved, to)
        const back = placeBack(ids, moved)
        if (!place) {
          expect(after).toEqual(ids)
          continue
        }
        // Apply the undo placement to the moved list.
        const rest = after.filter((x) => x !== moved)
        const at =
          back && 'before' in back
            ? rest.indexOf(back.before)
            : rest.indexOf((back as { after: string }).after) + 1
        expect(moveId(after, moved, at)).toEqual(ids)
      }
    }
  })

  it('finds the landing index from the row under the pointer', () => {
    expect(indexOver(ids, 'a', 'c', false)).toBe(1) // before c: b [a] c d
    expect(indexOver(ids, 'a', 'c', true)).toBe(2)
    expect(indexOver(ids, 'd', 'a', false)).toBe(0)
    expect(indexOver(ids, 'a', 'a', false)).toBeNull() // over itself
    expect(indexOver(ids, 'a', 'nope', false)).toBeNull()
  })

  it('lists row ids per group, in the order shown', () => {
    const items: GroupedItem[] = [
      { kind: 'group', key: 'To do', count: 2 },
      row('a'),
      row('b'),
      { kind: 'group', key: 'Done', count: 0 },
      { kind: 'group', key: '', count: 1 },
      row('c'),
    ]
    expect([...idsByGroup(items)]).toEqual([
      ['To do', ['a', 'b']],
      ['Done', []],
      ['', ['c']],
    ])
    expect(idsByGroup([row('x'), row('y')]).get('')).toEqual(['x', 'y'])
  })
})
