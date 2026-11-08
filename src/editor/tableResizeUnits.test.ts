import { describe, expect, it } from 'vitest'
import {
  fitColumnWidth,
  MAX_COL,
  MIN_COL,
  parseRowHeights,
  withRowHeight,
} from './tableResize'

describe('table sizing helpers', () => {
  it('parses and writes row heights', () => {
    expect(parseRowHeights('60,0,x,90')).toEqual([60, 0, 0, 90])
    expect(withRowHeight('', 2, 80)).toBe('0,0,80')
    expect(withRowHeight('0,0,80', 2, 0)).toBe('')
    expect(withRowHeight('', 0, 5000)).toBe('800')
  })
  it('fits a column inside the limits', () => {
    expect(fitColumnWidth(10, 10)).toBe(MIN_COL)
    expect(fitColumnWidth(5000, 10)).toBe(MAX_COL)
    expect(fitColumnWidth(120.2, 20)).toBe(141)
  })
})
