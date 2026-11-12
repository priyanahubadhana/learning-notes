import { describe, expect, it } from 'vitest'
import { createHistory, type HistoryEntry } from './settingsHistory'

const one = (id: string, before: number, after: number): HistoryEntry => ({
  label: id,
  items: [{ id, before, after }],
})

describe('settings history (SET-B10, B11, B14)', () => {
  it('undoes and redoes in order', () => {
    const h = createHistory()
    h.push(one('a', 1, 2))
    h.push(one('b', 5, 6))
    expect(h.undo()?.label).toBe('b')
    expect(h.undo()?.label).toBe('a')
    expect(h.undo()).toBeUndefined()
    expect(h.canRedo()).toBe(true)
    expect(h.redo()?.label).toBe('a')
    expect(h.redo()?.label).toBe('b')
    expect(h.canRedo()).toBe(false)
  })
  it('a new change ends Redo', () => {
    const h = createHistory()
    h.push(one('a', 1, 2))
    h.undo()
    h.push(one('b', 1, 2))
    expect(h.canRedo()).toBe(false)
    expect(h.canUndo()).toBe(true)
  })
  it('a section reset is one step holding every setting', () => {
    const h = createHistory()
    h.push({
      label: 'Section reset',
      items: [
        { id: 'a', before: 1, after: 0 },
        { id: 'b', before: 'x', after: 'y' },
      ],
    })
    expect(h.undo()?.items).toHaveLength(2)
    expect(h.canUndo()).toBe(false)
  })
  it('ignores an empty step and keeps at most the limit', () => {
    const h = createHistory(2)
    h.push({ label: 'none', items: [] })
    expect(h.canUndo()).toBe(false)
    h.push(one('a', 1, 2))
    h.push(one('b', 1, 2))
    h.push(one('c', 1, 2))
    h.undo()
    h.undo()
    expect(h.undo()).toBeUndefined()
  })
  it('clear forgets everything (leaving Settings)', () => {
    const h = createHistory()
    h.push(one('a', 1, 2))
    h.clear()
    expect(h.canUndo()).toBe(false)
  })
})
