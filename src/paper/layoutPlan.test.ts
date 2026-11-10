import { describe, expect, it } from 'vitest'
import type { GridRow } from '../core/types'
import { PRESETS, readingIds } from './grid'
import {
  arrangeAll,
  fillSlot,
  finish,
  NEW,
  orderedPresets,
  previewRows,
  startLayout,
  zonesOf,
} from './layoutPlan'

const row = (id: string, ...cols: string[][]): GridRow => ({
  id,
  cols: cols.map((boxIds) => ({ w: 1 / cols.length, boxIds })),
})
const base = (): GridRow[] => [
  row('r0', ['main']),
  row('r1', ['a']),
  row('r2', ['b']),
  row('r3', ['c']),
]

describe('layout assist', () => {
  it('every preset starts with the anchor in the chosen zone and no box made', () => {
    for (const p of PRESETS)
      for (let z = 0; z < zonesOf(p).length; z++) {
        const d = startLayout(base(), 'a', p.id, z)!
        expect(d.slots[z]).toBe('a')
        expect(d.slots.filter((v) => v === NEW)).toHaveLength(0)
        const out = finish(base(), d, [])!
        expect(readingIds(out.rows).sort()).toEqual(['a', 'b', 'c', 'main'])
        expect(out.newCount).toBe(0)
      }
  })
  it('1:1:1 with the two other boxes tapped gives one row of three', () => {
    let d = startLayout(base(), 'a', 'three', 0)!
    d = fillSlot(d, 1, 'b')
    d = fillSlot(d, 2, 'c')
    const out = finish(base(), d, [])!
    expect(out.rows).toHaveLength(2) // the page text, then one row
    expect(out.rows[1].cols.map((c) => c.boxIds)).toEqual([['a'], ['b'], ['c']])
  })
  it('Skip: empty zones collapse and no box is created', () => {
    const d = startLayout(base(), 'a', 'two', 0)!
    const out = finish(base(), d, [])!
    expect(out.newCount).toBe(0)
    const made = out.rows.find((r) => r.id === d.rowId)!
    expect(made.cols).toHaveLength(1)
    expect(made.cols[0].w).toBe(1)
  })
  it('+ New box makes exactly one box', () => {
    let d = startLayout(base(), 'a', 'two', 0)!
    d = fillSlot(d, 1, NEW)
    const out = finish(base(), d, ['n1'])!
    expect(out.newCount).toBe(1)
    expect(readingIds(out.rows)).toContain('n1')
  })
  it('shrinking 1:1:1 to 1:1 keeps every box (the extra goes to a row below)', () => {
    const rows: GridRow[] = [
      row('r0', ['main']),
      row('r1', ['a'], ['b'], ['c']),
    ]
    const d = startLayout(rows, 'a', 'two', 0)!
    const out = finish(rows, d, [])!
    expect(readingIds(out.rows).sort()).toEqual(['a', 'b', 'c', 'main'])
    expect(out.rows).toHaveLength(3)
  })
  it('dropping on a filled zone swaps', () => {
    let d = startLayout(base(), 'a', 'two', 0)!
    d = fillSlot(d, 1, 'b')
    d = fillSlot(d, 0, 'b')
    expect(d.slots).toEqual(['b', 'a'])
  })
  it('a box from another row leaves its old row', () => {
    let d = startLayout(base(), 'a', 'two', 0)!
    d = fillSlot(d, 1, 'c')
    const out = finish(base(), d, [])!
    expect(out.rows.some((r) => r.id === 'r3')).toBe(false)
  })
  it('the preview keeps empty zones as placeholders', () => {
    const d = startLayout(base(), 'a', 'three', 1)!
    const ids = readingIds(previewRows(base(), d))
    expect(ids).toContain('slot:0')
    expect(ids).toContain('slot:2')
  })
  it('the whole notebook: boxes fill the layout row by row, the page text stays first', () => {
    const out = arrangeAll(base(), 'two')!
    expect(out[0].cols[0].boxIds).toEqual(['main'])
    expect(out[1].cols.map((c) => c.boxIds)).toEqual([['a'], ['b']])
    expect(out[2].cols.map((c) => c.boxIds)).toEqual([['c']])
    expect(readingIds(out).sort()).toEqual(['a', 'b', 'c', 'main'])
  })
  it('recent layouts come first', () => {
    expect(
      orderedPresets(['six', 'two'])
        .map((p) => p.id)
        .slice(0, 3),
    ).toEqual(['six', 'two', 'one'])
  })
})
