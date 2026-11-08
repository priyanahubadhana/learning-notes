import { describe, expect, it } from 'vitest'
import {
  dropOnPaper,
  setPaperDrop,
  type Carried,
  type CarriedLines,
} from './inkTransfer'

describe('rule 6 across boxes: lines travel with the ink', () => {
  it('hands the lines to the paper together with the ink', () => {
    const seen: (CarriedLines | undefined)[] = []
    setPaperDrop((_items, lines) => {
      seen.push(lines)
      return true
    })
    const lines: CarriedLines = { blocks: [{ type: 'paragraph' }], refY: 40 }
    expect(dropOnPaper([] as Carried[], lines)).toBe(true)
    expect(seen[0]).toBe(lines)
    setPaperDrop(null)
    expect(dropOnPaper([] as Carried[], lines)).toBe(false)
  })
})
