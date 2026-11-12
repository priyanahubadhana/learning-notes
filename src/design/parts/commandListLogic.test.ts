import { describe, expect, it } from 'vitest'
import {
  buildList,
  filterGroups,
  moveIndex,
  pushRecent,
  scoreCommand,
  type CommandGroup,
} from './commandListLogic'

const groups: CommandGroup[] = [
  {
    id: 'a',
    label: 'A',
    items: [
      { id: 'bold', label: 'Bold', aliases: ['strong'] },
      { id: 'colour', label: 'Colour', aliases: ['color'] },
      { id: 'table', label: 'Table' },
    ],
  },
  {
    id: 'b',
    label: 'B',
    items: [
      { id: 'picture', label: 'Picture', aliases: ['image'] },
      { id: 'link', label: 'Link' },
      { id: 'code', label: 'Code block' },
    ],
  },
]

describe('scoring and filtering', () => {
  it('matches by name and by alias, ignoring case', () => {
    expect(scoreCommand(groups[0].items[1], 'COL')).toBeGreaterThan(0)
    expect(scoreCommand(groups[0].items[1], 'color')).toBeGreaterThan(0)
    expect(scoreCommand(groups[0].items[0], 'zzz')).toBe(0)
  })
  it('every word must match', () => {
    expect(scoreCommand(groups[1].items[2], 'code blo')).toBeGreaterThan(0)
    expect(scoreCommand(groups[1].items[2], 'code zzz')).toBe(0)
  })
  it('keeps only groups with matches', () => {
    const f = filterGroups(groups, 'image')
    expect(f.map((g) => g.id)).toEqual(['b'])
    expect(f[0].items.map((i) => i.id)).toEqual(['picture'])
  })
  it('puts a name start before a looser match', () => {
    const g: CommandGroup[] = [
      {
        id: 'x',
        label: 'X',
        items: [
          { id: 'one', label: 'Add table' },
          { id: 'two', label: 'Table' },
        ],
      },
    ]
    expect(filterGroups(g, 'tab')[0].items.map((i) => i.id)).toEqual([
      'two',
      'one',
    ])
  })
})

describe('recent', () => {
  it('keeps the last 3, newest first, no repeats', () => {
    let r: string[] = []
    for (const id of ['a', 'b', 'c', 'd', 'b']) r = pushRecent(r, id)
    expect(r).toEqual(['b', 'd', 'c'])
  })
})

describe('buildList', () => {
  const base = { groups, query: '', recent: [] as string[], showAll: false }
  it('cuts to the limit and adds a Show all row', () => {
    const b = buildList({ ...base, limit: 4 })
    expect(b.rows.filter((r) => r.kind === 'item')).toHaveLength(4)
    expect(b.rows.at(-1)?.kind).toBe('showAll')
    expect(b.hidden).toBe(2)
  })
  it('Show all lists every group and drops the row', () => {
    const b = buildList({ ...base, limit: 4, showAll: true })
    expect(b.rows.filter((r) => r.kind === 'item')).toHaveLength(6)
    expect(b.rows.some((r) => r.kind === 'showAll')).toBe(false)
  })
  it('puts Recent first and searches without a limit', () => {
    const b = buildList({ ...base, recent: ['link', 'bold'] })
    expect(b.rows[0]).toMatchObject({ kind: 'heading', key: 'h-recent' })
    expect(b.rows[1]).toMatchObject({ kind: 'item', recent: true })
    const s = buildList({ ...base, query: 'o', recent: ['link'], limit: 1 })
    expect(s.rows.some((r) => r.kind === 'showAll')).toBe(false)
    expect(s.rows.some((r) => r.kind === 'item' && r.recent)).toBe(false)
  })
  it('no match gives no navigable rows', () => {
    const b = buildList({ ...base, query: 'qqq' })
    expect(b.navKeys).toEqual([])
    expect(b.matches).toBe(0)
  })
})

describe('moveIndex', () => {
  it('wraps both ways and copes with an empty list', () => {
    expect(moveIndex(0, -1, 3)).toBe(2)
    expect(moveIndex(2, 1, 3)).toBe(0)
    expect(moveIndex(-1, 1, 3)).toBe(0)
    expect(moveIndex(0, 1, 0)).toBe(-1)
  })
})
