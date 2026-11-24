import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LAYOUT,
  fitsSlot,
  moveWidget,
  normalizeLayout,
  setSize,
  settleWidget,
  spanOf,
  columnsFor,
  WIDGET_IDS,
  type Layout,
} from './boardLogic'
import { layoutGrid, snapToFit } from '../../design/parts/drag/reorder'

const L = (...a: [string, 's' | 'm' | 'l'][]): Layout =>
  a.map(([id, size]) => ({ id: id as never, size }))

describe('normalizeLayout', () => {
  it('keeps every widget exactly once, whatever is stored', () => {
    for (const raw of [
      null,
      'x',
      [],
      [{ id: 'nope', size: 's' }],
      [
        { id: 'top3', size: 'x' },
        { id: 'top3', size: 's' },
      ],
    ]) {
      const out = normalizeLayout(raw)
      expect(out.map((s) => s.id).sort()).toEqual([...WIDGET_IDS].sort())
    }
  })
  it('keeps order and sizes and fixes bad sizes', () => {
    const out = normalizeLayout([
      { id: 'timer', size: 's' },
      { id: 'top3', size: 'zzz' },
    ])
    expect(out[0]).toEqual({ id: 'timer', size: 's' })
    expect(out[1]).toEqual({ id: 'top3', size: 'm' })
  })
})

describe('setSize', () => {
  it('changes only that widget and never removes one', () => {
    const next = setSize(DEFAULT_LAYOUT, 'top3', 'l')
    expect(next).toHaveLength(DEFAULT_LAYOUT.length)
    expect(next.find((s) => s.id === 'top3')?.size).toBe('l')
    expect(next.map((s) => s.id)).toEqual(DEFAULT_LAYOUT.map((s) => s.id))
  })
})

describe('fit rule (reflow / snap)', () => {
  const four = L(
    ['cards', 's'],
    ['briefing', 's'],
    ['top3', 's'],
    ['timer', 's'],
  )
  const ids = (l: Layout) => l.map((s) => s.id as string)

  it('a medium widget dropped between small ones fits and the smalls wrap', () => {
    const withM = setSize(four, 'timer', 'm')
    const order = ['cards', 'timer', 'briefing', 'top3']
    expect(fitsSlot(withM, order, 1)).toBe(true)
    const spans = order.map((id) => (id === 'timer' ? 2 : 1))
    const p = layoutGrid(spans, 4)
    expect(p[1]).toMatchObject({ row: 0, col: 1, span: 2 })
    expect(p[2]).toMatchObject({ row: 0, col: 3 })
    expect(p[3]).toMatchObject({ row: 1, col: 0 })
  })

  it('a full-row widget between small ones does not fit there', () => {
    const withL = setSize(four, 'timer', 'l')
    const order = ['cards', 'timer', 'briefing', 'top3']
    expect(fitsSlot(withL, order, 1)).toBe(false)
  })

  it('snaps an impossible spot to the nearest fit (ties: earlier)', () => {
    const withL = setSize(four, 'timer', 'l')
    const fit = (slot: number) => {
      const order = ids(moveWidget(withL, 'timer', slot))
      return fitsSlot(withL, order, slot)
    }
    // dropping at slot 1 snaps to slot 0 (row start), the earlier tie
    expect(snapToFit(1, 4, fit)).toBe(0)
    expect(snapToFit(2, 4, fit)).toBe(snapToFit(2, 4, fit))
    expect(fit(snapToFit(2, 4, fit))).toBe(true)
  })

  it('settleWidget moves a grown widget to a spot that fits', () => {
    const grown = setSize(four, 'briefing', 'l')
    const settled = settleWidget(grown, 'briefing')
    expect(settled).toHaveLength(4)
    const i = settled.findIndex((s) => s.id === 'briefing')
    expect(
      fitsSlot(
        settled,
        settled.map((s) => s.id),
        i,
      ),
    ).toBe(true)
  })

  it('settleWidget leaves a widget that already fits', () => {
    expect(settleWidget(DEFAULT_LAYOUT, 'cards')).toBe(DEFAULT_LAYOUT)
  })
})

describe('real column count (phone and narrow widths)', () => {
  it('a full-row widget takes the whole row on 2 columns, never more', () => {
    expect(spanOf('l', 2)).toBe(2)
    expect(spanOf('m', 2)).toBe(2)
    expect(spanOf('s', 2)).toBe(1)
    expect(spanOf('l', 1)).toBe(1)
    expect(spanOf('l')).toBe(4)
  })
  it('the fit rule follows the columns', () => {
    const l: Layout = [
      { id: 'cards', size: 's' },
      { id: 'briefing', size: 'm' },
      { id: 'top3', size: 's' },
    ]
    const order = ['cards', 'briefing', 'top3']
    // 4 columns: a medium after one small fits. 2 columns: it would leave a hole.
    expect(fitsSlot(l, order, 1, 4)).toBe(true)
    expect(fitsSlot(l, order, 1, 2)).toBe(false)
  })
  it('settleWidget uses the given columns', () => {
    const l: Layout = [
      { id: 'cards', size: 's' },
      { id: 'briefing', size: 'm' },
      { id: 'top3', size: 's' },
    ]
    const out = settleWidget(l, 'briefing', 2)
    const i = out.findIndex((s) => s.id === 'briefing')
    expect(
      fitsSlot(
        out,
        out.map((s) => s.id),
        i,
        2,
      ),
    ).toBe(true)
  })
})

describe('columnsFor', () => {
  it('matches the grid css at phone, iPad and desktop widths', () => {
    expect(columnsFor(358, 12, 144)).toBe(2)
    expect(columnsFor(260, 12, 144)).toBe(1)
    expect(columnsFor(736, 12, 144)).toBe(4)
    expect(columnsFor(2000, 12, 144)).toBe(4)
    expect(columnsFor(0, 12, 144)).toBe(4)
  })
})

describe('columnsFor with a most-columns cap (gate 3: 2 columns below 860 px)', () => {
  it('never gives more columns than the cap, even on a wide list', () => {
    expect(columnsFor(768, 12, 144, 2)).toBe(2)
    expect(columnsFor(768, 12, 144, 4)).toBe(4)
  })
})
