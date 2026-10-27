import { describe, expect, it } from 'vitest'
import type { DbColumn, JsonObject, Page } from '../../core/types'
import type { ResolvedRow } from '../databaseQuery'
import {
  NO_VALUE,
  cardPlace,
  dropNeighbour,
  withCardMoved,
  boardGroupColumn,
  cardColumns,
  groupRows,
  groupValue,
  groupableColumns,
  withCardColumn,
  withGroupBy,
} from './boardGroups'

const column = (id: string, type: string, config: JsonObject = {}) =>
  ({
    id,
    databaseId: 'd',
    name: id,
    type,
    config,
    order: id,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
  }) as DbColumn

const status = column('status', 'choice', {
  options: [
    { id: 'o1', name: 'To do' },
    { id: 'o2', name: 'Done', color: 'green' },
  ],
})
const level = column('level', 'choice', { options: [{ id: 'l1', name: 'A' }] })
const notes = column('notes', 'text')
const stars = column('stars', 'number')
const tags = column('tags', 'choices')
const columns = [notes, status, stars, level, tags]

const row = (id: string, values: JsonObject = {}) =>
  ({
    page: { id, values } as unknown as Page,
    values: {},
    links: {},
  }) as ResolvedRow

describe('board groups', () => {
  it('groups by the saved Choice column, else the first one', () => {
    expect(groupableColumns(columns).map((c) => c.id)).toEqual([
      'status',
      'level',
    ])
    expect(boardGroupColumn({}, columns)?.id).toBe('status')
    expect(boardGroupColumn(withGroupBy({}, 'level'), columns)?.id).toBe(
      'level',
    )
    // A deleted or non-choice column falls back to the first Choice.
    expect(boardGroupColumn({ groupBy: 'notes' }, columns)?.id).toBe('status')
    expect(boardGroupColumn({}, [notes])).toBeUndefined()
  })

  it('puts rows in option order, blank or unknown values in "No …"', () => {
    const rows = [
      row('a', { status: 'o2' }),
      row('b'),
      row('c', { status: 'o1' }),
      row('d', { status: 'gone' }),
      row('e', { status: 'Done' }), // text read as a choice by name
    ]
    const groups = groupRows(rows, status)
    expect(groups.map((g) => g.key)).toEqual([NO_VALUE, 'o1', 'o2'])
    expect(groups.map((g) => g.rows.map((r) => r.page.id))).toEqual([
      ['b', 'd'],
      ['c'],
      ['a', 'e'],
    ])
    expect(groups[2].option?.name).toBe('Done')
    expect(groupValue(NO_VALUE)).toBeNull()
    expect(groupValue('o1')).toBe('o1')
  })

  it('cards show the first values, or the picked ones, never the grouping', () => {
    expect(cardColumns({}, columns, 'status').map((c) => c.id)).toEqual([
      'notes',
      'stars',
      'level',
    ])
    let config = withCardColumn({}, columns, 'status', 'notes', false)
    config = withCardColumn(config, columns, 'status', 'tags', true)
    // Shown in column order, whatever order they were picked in.
    expect(cardColumns(config, columns, 'status').map((c) => c.id)).toEqual([
      'stars',
      'level',
      'tags',
    ])
    expect(cardColumns(config, columns, 'level').map((c) => c.id)).toEqual([
      'stars',
      'tags',
    ])
    config = withCardColumn({}, columns, 'status', 'notes', false)
    config = withCardColumn(config, columns, 'status', 'stars', false)
    config = withCardColumn(config, columns, 'status', 'level', false)
    expect(cardColumns(config, columns, 'status')).toEqual([])
  })

  it('groups 10,000 rows quickly', () => {
    const rows = Array.from({ length: 10_000 }, (_, i) =>
      row(`r${i}`, i % 3 === 0 ? {} : { status: i % 3 === 1 ? 'o1' : 'o2' }),
    )
    const start = performance.now()
    const groups = groupRows(rows, status)
    const ms = performance.now() - start
    expect(groups.map((g) => g.rows.length)).toEqual([3334, 3333, 3333])
    expect(ms).toBeLessThan(200)
  })
})

describe('moving cards', () => {
  const groups = () =>
    groupRows(
      [
        row('a', { status: 'o1' }),
        row('b', { status: 'o1' }),
        row('c', { status: 'o2' }),
      ],
      status,
    )
  const ids = (gs: ReturnType<typeof groups>) =>
    gs.map((g) => g.rows.map((r) => r.page.id))

  it('moves a card into a group at an index, for the preview', () => {
    expect(cardPlace(groups(), 'b')).toEqual({
      rowId: 'b',
      key: 'o1',
      index: 1,
    })
    expect(cardPlace(groups(), 'zz')).toBeNull()
    expect(
      ids(withCardMoved(groups(), { rowId: 'b', key: 'o2', index: 0 })),
    ).toEqual([[], ['a'], ['b', 'c']])
    expect(
      ids(withCardMoved(groups(), { rowId: 'a', key: 'o1', index: 9 })),
    ).toEqual([[], ['b', 'a'], ['c']])
    expect(
      ids(withCardMoved(groups(), { rowId: 'c', key: NO_VALUE, index: 0 })),
    ).toEqual([['c'], ['a', 'b'], []])
  })

  it('finds the row a dropped card goes next to', () => {
    expect(
      dropNeighbour(groups(), { rowId: 'c', key: 'o1', index: 0 }),
    ).toEqual({
      before: 'a',
    })
    expect(
      dropNeighbour(groups(), { rowId: 'c', key: 'o1', index: 2 }),
    ).toEqual({
      after: 'b',
    })
    expect(
      dropNeighbour(groups(), { rowId: 'a', key: 'o1', index: 1 }),
    ).toEqual({
      after: 'b',
    })
    expect(
      dropNeighbour(groups(), { rowId: 'c', key: NO_VALUE, index: 0 }),
    ).toBeNull()
  })
})
