import { describe, expect, it } from 'vitest'
import {
  MAX_ROWS,
  describeEvent,
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
    count: 1,
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

describe('folding and touch type', () => {
  const mk = (id: number, type: string): CheckRow => ({
    id,
    type,
    pointerType: 'pen',
    target: 'div.sbar',
    prevented: false,
    buttons: '1',
    pressure: '0.50',
    touchType: '-',
    touchAction: 'none',
    bubbled: false,
    barHandled: false,
    count: 1,
  })
  it('folds repeated moves into one row with a count', () => {
    let rows: CheckRow[] = []
    rows = pushRow(rows, mk(1, 'pointerdown'))
    for (let i = 2; i < 60; i++) rows = pushRow(rows, mk(i, 'pointermove'))
    expect(rows).toHaveLength(2)
    expect(rows[0].count).toBe(58)
    expect(rows[1].type).toBe('pointerdown')
  })
  it('keeps a move that comes after a different event as its own row', () => {
    let rows = pushRow([], mk(1, 'pointermove'))
    rows = pushRow(rows, mk(2, 'pointerup'))
    rows = pushRow(rows, mk(3, 'pointermove'))
    expect(rows.map((r) => r.type)).toEqual([
      'pointermove',
      'pointerup',
      'pointermove',
    ])
  })
  it('reads touchType (stylus / direct) from touches', () => {
    const stylus = {
      type: 'touchstart',
      defaultPrevented: false,
      target: null,
      changedTouches: [{ touchType: 'stylus' }],
    } as unknown as Event
    const finger = {
      type: 'touchmove',
      defaultPrevented: false,
      target: null,
      touches: [{ touchType: 'direct' }],
    } as unknown as Event
    expect(describeEvent(stylus, 1, () => false).touchType).toBe('stylus')
    expect(describeEvent(finger, 2, () => false).touchType).toBe('direct')
  })
})
