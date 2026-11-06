import { describe, expect, it } from 'vitest'
import { earliestAt, replayTarget } from './replay'

const rec = (
  id: string,
  startedAt: number,
  durationMs: number,
  deletedAt: number | null = null,
) => ({ id, startedAt, durationMs, deletedAt })

describe('replayTarget', () => {
  const rows = [rec('a', 10_000, 60_000), rec('b', 100_000, 30_000)]

  it('finds the recording a stroke was written in, and the second', () => {
    expect(replayTarget(rows, 25_500)).toEqual({
      recordingId: 'a',
      seconds: 15.5,
    })
    expect(replayTarget(rows, 100_000)).toEqual({
      recordingId: 'b',
      seconds: 0,
    })
  })

  it('returns null outside every recording', () => {
    expect(replayTarget(rows, 5_000)).toBeNull()
    expect(replayTarget(rows, 80_000)).toBeNull()
    expect(replayTarget([], 5_000)).toBeNull()
  })

  it('allows a little slack after the end, but not a lot', () => {
    expect(replayTarget(rows, 71_000)?.recordingId).toBe('a')
    expect(replayTarget(rows, 73_000)).toBeNull()
  })

  it('ignores deleted recordings and prefers the newest overlap', () => {
    expect(replayTarget([rec('a', 0, 10_000, 5)], 1000)).toBeNull()
    const overlap = [rec('old', 0, 50_000), rec('new', 20_000, 50_000)]
    expect(replayTarget(overlap, 30_000)?.recordingId).toBe('new')
  })
})

describe('earliestAt', () => {
  it('takes the earliest real time and skips strokes with none', () => {
    expect(earliestAt([5000, 0, 3000, 9000])).toBe(3000)
    expect(earliestAt([0, 0])).toBe(0)
    expect(earliestAt([])).toBe(0)
  })
})
