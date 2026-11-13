import { describe, expect, it } from 'vitest'
import {
  canRedo,
  canUndo,
  commit,
  newHistory,
  redo,
  undo,
} from './studioHistory'

describe('Studio plan Undo and Redo (A3)', () => {
  it('Undo takes the last change back and Redo puts it again', () => {
    let h = newHistory({ sel: [] as string[] })
    h = commit(h, { sel: ['notes'] }, 'tick')
    h = commit(h, { sel: ['notes', 'map'] }, 'tick')
    expect(canUndo(h)).toBe(true)
    expect(canRedo(h)).toBe(false)
    h = undo(h)
    expect(h.present).toEqual({ sel: ['notes'] })
    expect(canRedo(h)).toBe(true)
    h = redo(h)
    expect(h.present).toEqual({ sel: ['notes', 'map'] })
  })
  it('a new change drops what Redo would have brought back', () => {
    let h = newHistory(0)
    h = commit(h, 1, 'a')
    h = undo(h)
    h = commit(h, 2, 'b')
    expect(canRedo(h)).toBe(false)
    expect(h.present).toBe(2)
  })
  it('typing a name is ONE step: same key joins into the last entry', () => {
    let h = newHistory('')
    h = commit(h, 'H', 'name', 'name')
    h = commit(h, 'Ha', 'name', 'name')
    h = commit(h, 'Hab', 'name', 'name')
    h = undo(h)
    expect(h.present).toBe('')
    expect(canUndo(h)).toBe(false)
  })
  it('Undo and Redo with nothing to do change nothing', () => {
    const h = newHistory(5)
    expect(undo(h)).toBe(h)
    expect(redo(h)).toBe(h)
  })
  it('keeps at most 50 steps', () => {
    let h = newHistory(0)
    for (let i = 1; i <= 80; i++) h = commit(h, i, 'x')
    let n = 0
    while (canUndo(h)) {
      h = undo(h)
      n++
    }
    expect(n).toBe(50)
  })
})
