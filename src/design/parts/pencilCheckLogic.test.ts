import { describe, expect, it } from 'vitest'
import {
  MAX_ROWS,
  pencilCheckShown,
  pushRow,
  shortTarget,
  type CheckRow,
} from './pencilCheckLogic'

describe('pencilCheckShown (P1.5a)', () => {
  it('shows only on the preview host with ?pencilcheck=1', () => {
    expect(pencilCheckShown(true, '?pencilcheck=1')).toBe(true)
    expect(pencilCheckShown(true, '?a=1&pencilcheck=1')).toBe(true)
  })
  it('never shows on the live host', () => {
    expect(pencilCheckShown(false, '?pencilcheck=1')).toBe(false)
  })
  it('never shows without the parameter or with another value', () => {
    expect(pencilCheckShown(true, '')).toBe(false)
    expect(pencilCheckShown(true, '?pencilcheck=0')).toBe(false)
    expect(pencilCheckShown(true, '?pencilcheck')).toBe(false)
  })
})

describe('rows', () => {
  const row = (id: number): CheckRow => ({
    id,
    type: 'pointerdown',
    pointerType: 'pen',
    target: 'div',
    prevented: false,
    buttons: '1',
    pressure: '0.50',
    touchType: '-',
    touchAction: 'none',
    bubbled: true,
    barHandled: true,
  })
  it('keeps the newest 25, newest first', () => {
    let rows: CheckRow[] = []
    for (let i = 0; i < 40; i++) rows = pushRow(rows, row(i))
    expect(rows).toHaveLength(MAX_ROWS)
    expect(rows[0].id).toBe(39)
  })
  it('names a missing target with a dash', () => {
    expect(shortTarget(null)).toBe('-')
  })
})
