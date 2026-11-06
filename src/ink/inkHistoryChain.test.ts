import { describe, expect, it } from 'vitest'
import { emptyEdit } from './inkDoc'
import { InkHistory } from './inkHistory'

describe('one Undo for drawings and text together', () => {
  it('knows a text step made right after an ink edit belongs to it', () => {
    const h = new InkHistory()
    h.push({ ...emptyEdit() }, 4) // the ink delete, text depth was 4
    h.chainTop()
    // The blocks were removed: text depth 5.
    expect(h.undoIsChained(5)).toBe(true)
    // Typing after it (depth 6) is a separate step.
    expect(h.undoIsChained(6)).toBe(false)
    // After the double undo the ink edit waits to be redone with its text.
    h.takeUndo()
    expect(h.redoIsChained()).toBe(true)
  })
  it('an ordinary ink edit is never chained', () => {
    const h = new InkHistory()
    h.push({ ...emptyEdit() }, 4)
    expect(h.undoIsChained(5)).toBe(false)
  })
})
