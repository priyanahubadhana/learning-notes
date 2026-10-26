import { describe, expect, it } from 'vitest'
import type { JsonObject } from '../../core/types'
import {
  knownQuery,
  readHidden,
  readRowQuery,
  withFilter,
  withHidden,
  withoutQuery,
  withSort,
} from './viewConfig'

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

  it('changes sorts, filters and hidden columns', () => {
    let config: JsonObject = { other: 1 }
    config = withSort(config, { columnId: 'a', direction: 'desc' })
    config = withSort(config, { columnId: 'b', direction: 'asc' })
    expect(config.sorts).toEqual([{ columnId: 'b', direction: 'asc' }])
    config = withFilter(config, 'c', { columnId: 'c', op: 'gt', value: 3 })
    config = withFilter(config, 'd', { columnId: 'd', op: 'isEmpty' })
    config = withFilter(config, 'c', { columnId: 'c', op: 'lt', value: 9 })
    expect(config.filters).toEqual([
      { columnId: 'd', op: 'isEmpty' },
      { columnId: 'c', op: 'lt', value: 9 },
    ])
    config = withHidden(config, 'x', true)
    config = withHidden(config, 'x', true)
    expect(readHidden(config)).toEqual(['x'])
    expect(withHidden(config, 'x', false).hidden).toBeUndefined()
    expect(withFilter(withFilter(config, 'c', null), 'd', null).filters).toBe(
      undefined,
    )
    expect(withoutQuery(config)).toEqual({ other: 1, hidden: ['x'] })
    expect(withSort(config, null).sorts).toBeUndefined()
  })

  it('drops sorts and filters on columns that are gone', () => {
    const query = readRowQuery({
      sorts: [{ columnId: 'gone' }],
      filters: [
        { columnId: 'a', op: 'isEmpty' },
        { columnId: 'gone', op: 'isEmpty' },
      ],
    })
    expect(knownQuery(query, new Set(['a']))).toEqual({
      sorts: [],
      filters: [{ columnId: 'a', op: 'isEmpty' }],
      match: 'all',
    })
  })
})
