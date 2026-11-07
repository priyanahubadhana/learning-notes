import { describe, expect, it } from 'vitest'
import { DEFAULT_ROW, mostlyInside, ROW_ACTIONS, splitMenu } from './lassoMenu'

describe('the Lasso menu', () => {
  it('splits the actions into the row and More, keeping the order', () => {
    const { row, more } = splitMenu(ROW_ACTIONS, DEFAULT_ROW)
    expect(row).toEqual(['copy', 'cut', 'duplicate', 'convert', 'colour'])
    expect(more).toEqual([
      'delete',
      'thickness',
      'makeCard',
      'summary',
      'label',
    ])
    expect(splitMenu(ROW_ACTIONS, ['label', 'copy']).row).toEqual([
      'copy',
      'label',
    ])
  })
  it('a line counts when most of its middle is inside the loop', () => {
    const b = { x: 0, y: 0, w: 100, h: 20 }
    expect(mostlyInside(b, (p) => p.x < 60)).toBe(true) // 10, 30, 50
    expect(mostlyInside(b, (p) => p.x < 40)).toBe(false) // 10, 30
    expect(mostlyInside(b, () => true)).toBe(true)
  })
})
