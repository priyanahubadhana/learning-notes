import { describe, expect, it } from 'vitest'
import { starterTemplates } from '../templates/starterTemplates'
import { FALLBACK_SECONDS, averageSeconds, estimateMinutes } from './reviewTime'

describe('the minutes hint under the new-cards limit', () => {
  it('uses 8 seconds until there are enough reviews', () => {
    expect(averageSeconds([])).toBe(FALLBACK_SECONDS)
    expect(averageSeconds(Array(19).fill(3000))).toBe(FALLBACK_SECONDS)
  })

  it('averages the real durations and clips a card left open', () => {
    expect(averageSeconds(Array(20).fill(5000))).toBe(5)
    // One review of an hour counts as a minute at most.
    const mixed = [...Array(19).fill(4000), 3_600_000]
    expect(averageSeconds(mixed)).toBeCloseTo((19 * 4 + 60) / 20, 5)
  })

  it('gives whole minutes, at least one, none for a limit of 0', () => {
    expect(estimateMinutes(20, 8)).toBe(3) // 160 s
    expect(estimateMinutes(1, 8)).toBe(1)
    expect(estimateMinutes(0, 8)).toBe(0)
    expect(estimateMinutes(100, 12)).toBe(20)
  })
})

describe('memory templates start with a worked example', () => {
  it('every memory technique page has a grey example line', () => {
    const memory = starterTemplates().filter((tpl) => (tpl.since ?? 1) === 3)
    expect(memory.length).toBe(6)
    for (const tpl of memory) {
      const grey = tpl.blocks.filter(
        (b) =>
          b.type === 'paragraph' &&
          JSON.stringify(b.content).includes('"textColor":"gray"'),
      )
      expect(grey, tpl.title).toHaveLength(1)
    }
  })
})
