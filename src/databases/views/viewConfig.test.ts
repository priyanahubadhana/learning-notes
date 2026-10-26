import { describe, expect, it } from 'vitest'
import type { JsonObject } from '../../core/types'
import { readHidden, readRowQuery } from './viewConfig'

describe('view config', () => {
  it('reads sorts, filters and hidden columns', () => {
    const config: JsonObject = {
      sorts: [{ columnId: 'a', direction: 'desc' }, { columnId: 'b' }],
      filters: [{ columnId: 'c', op: 'gt', value: 3 }],
      match: 'any',
      hidden: ['x', 'y'],
    }
    expect(readRowQuery(config)).toEqual({
      sorts: [
        { columnId: 'a', direction: 'desc' },
        { columnId: 'b', direction: 'asc' },
      ],
      filters: [{ columnId: 'c', op: 'gt', value: 3 }],
      match: 'any',
    })
    expect(readHidden(config)).toEqual(['x', 'y'])
  })

  it('skips anything in the wrong shape', () => {
    const config: JsonObject = {
      sorts: [5, { columnId: 1 }, null],
      filters: [{ columnId: 'c', op: 'runCode' }, 'x'],
      hidden: 'all',
    }
    expect(readRowQuery(config)).toEqual({
      sorts: [],
      filters: [],
      match: 'all',
    })
    expect(readHidden(config)).toEqual([])
    expect(readRowQuery({})).toEqual({ sorts: [], filters: [], match: 'all' })
  })
})
