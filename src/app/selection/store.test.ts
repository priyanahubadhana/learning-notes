import { describe, expect, it, vi } from 'vitest'
import { createSelectionStore, isKind, type Selection } from './store'

const box = (ids: string[], owner = 'paper'): Selection => ({
  kind: 'box',
  owner,
  boxIds: ids,
})
const text: Selection = { kind: 'text', owner: 'editor', from: 1, to: 4 }

describe('selection store', () => {
  it('selecting a box clears text, ink and picture selections', () => {
    const s = createSelectionStore()
    const olds: Selection[] = [
      text,
      { kind: 'ink', owner: 'ink', strokeIds: ['a'] },
      { kind: 'picture', owner: 'editor', id: 'p' },
    ]
    for (const old of olds) {
      s.select(old)
      s.select(box(['b1']))
      expect(s.getSnapshot()).toEqual(box(['b1']))
    }
  })

  it('holds one kind at a time, for every kind', () => {
    const s = createSelectionStore()
    const all: Selection[] = [
      text,
      box(['b']),
      { kind: 'ink', owner: 'i', strokeIds: ['s'] },
      { kind: 'picture', owner: 'e', id: 'p' },
      { kind: 'cells', owner: 'e', tableId: 't', cells: [{ row: 0, col: 1 }] },
      { kind: 'rows', owner: 'd', rowIds: ['r'] },
    ]
    for (const sel of all) {
      s.select(sel)
      expect(s.getSnapshot()).toBe(sel)
    }
  })

  it('selecting the same thing again fires nothing and keeps the snapshot', () => {
    const s = createSelectionStore()
    const fn = vi.fn()
    const sub = vi.fn()
    s.select(box(['a', 'b']))
    const snap = s.getSnapshot()
    s.onChange(fn)
    s.subscribe(sub)
    s.select(box(['a', 'b']))
    expect(fn).not.toHaveBeenCalled()
    expect(sub).not.toHaveBeenCalled()
    expect(s.getSnapshot()).toBe(snap)
    s.select({
      kind: 'cells',
      owner: 'e',
      tableId: 't',
      cells: [{ row: 1, col: 1 }],
    })
    s.select({
      kind: 'cells',
      owner: 'e',
      tableId: 't',
      cells: [{ row: 1, col: 2 }],
    })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('the owner clears its selection; another owner does nothing', () => {
    const s = createSelectionStore()
    s.select(box(['a'], 'paper'))
    s.clear('ink')
    expect(s.getSnapshot().kind).toBe('box')
    s.clear('paper')
    expect(s.getSnapshot()).toEqual({ kind: 'none' })
    s.select(text)
    s.clear()
    expect(s.getSnapshot().kind).toBe('none')
  })

  it('each listener gets (next, previous) once per change', () => {
    const s = createSelectionStore()
    const a = vi.fn()
    const b = vi.fn()
    const offA = s.onChange(a)
    s.onChange(b)
    s.select(text)
    s.select(box(['x']))
    expect(a).toHaveBeenCalledTimes(2)
    expect(a).toHaveBeenNthCalledWith(1, text, { kind: 'none' })
    expect(a).toHaveBeenNthCalledWith(2, box(['x']), text)
    offA()
    s.clear()
    expect(a).toHaveBeenCalledTimes(2)
    expect(b).toHaveBeenCalledTimes(3)
  })

  it('clearing nothing fires nothing; snapshot is stable between changes', () => {
    const s = createSelectionStore()
    const fn = vi.fn()
    s.onChange(fn)
    s.clear()
    s.clear('x')
    expect(fn).not.toHaveBeenCalled()
    expect(s.getSnapshot()).toBe(s.getSnapshot())
  })

  it('unsubscribe stops subscribe listeners', () => {
    const s = createSelectionStore()
    const fn = vi.fn()
    const off = s.subscribe(fn)
    s.select(text)
    off()
    s.clear()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('isKind narrows', () => {
    expect(isKind(text, 'text')).toBe(true)
    expect(isKind(text, 'box')).toBe(false)
  })
})
