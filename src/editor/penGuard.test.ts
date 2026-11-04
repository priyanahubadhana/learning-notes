import { describe, expect, it } from 'vitest'
import { refuseDelete } from './penGuard'

const idle = { down: false, upAt: -1e9 }

describe('refuseDelete', () => {
  it('refuses a delete while the pen is down', () => {
    expect(
      refuseDelete('deleteContentBackward', 1000, { ...idle, down: true }, 0),
    ).toBe(true)
  })
  it('refuses it for 300 ms after the pen lifts, not after', () => {
    const pen = { down: false, upAt: 1000 }
    expect(refuseDelete('deleteByDrag', 1200, pen, 0)).toBe(true)
    expect(refuseDelete('deleteByDrag', 1300, pen, 0)).toBe(false)
  })
  it('lets a real key press through', () => {
    expect(
      refuseDelete('deleteContentBackward', 1000, { ...idle, down: true }, 800),
    ).toBe(false)
  })
  it('never refuses typing or a delete with no pen', () => {
    expect(refuseDelete('insertText', 1000, { ...idle, down: true }, 0)).toBe(
      false,
    )
    expect(refuseDelete('deleteContent', 1000, idle, 0)).toBe(false)
  })
})
