/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  KEEP,
  clearSlowMoments,
  noteSlowMoment,
  readSlowMoments,
  slowMomentsReport,
} from './slowMoments'

describe('slow moments (R6-11)', () => {
  beforeEach(() => clearSlowMoments())

  it('keeps only the last 50 on the device, newest last', () => {
    for (let i = 0; i < KEEP + 5; i++) noteSlowMoment('stall', 300 + i, i)
    const list = readSlowMoments()
    expect(list).toHaveLength(KEEP)
    expect(list[0].ms).toBe(305)
    expect(list[KEEP - 1].ms).toBe(300 + KEEP + 4)
    expect(list[0].route).toBe('')
  })

  it('writes a plain-text report with one line per moment', () => {
    noteSlowMoment('longtask', 120.4, Date.UTC(2026, 10, 7, 9, 30))
    noteSlowMoment('stall', 900, Date.UTC(2026, 10, 7, 9, 31))
    const report = slowMomentsReport(readSlowMoments(), 'TestBrowser/1')
    const lines = report.split('\n')
    expect(lines[0]).toBe('Learning Notes slow moments (2)')
    expect(lines[1]).toBe('TestBrowser/1')
    expect(lines.at(-2)).toContain('2026-11-07 09:30:00  long task  120 ms')
    expect(lines.at(-1)).toContain('froze  900 ms')
  })
})
