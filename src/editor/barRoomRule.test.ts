import { describe, expect, it } from 'vitest'
import { barLayout } from '../app/tools/barLayout'
import { barRoomWanted, isDocked } from './barRoomRule'

const base = {
  v8: true,
  pageRoute: true,
  placement: 'top' as const,
  layout: barLayout('top', false, 'both', 'same'),
  autoHide: false,
  inReading: false,
}

describe('isDocked (the rule PageEditor draws the docked bar by)', () => {
  it('is docked unless floating, read-only or reading', () => {
    expect(isDocked('top', false, false)).toBe(true)
    expect(isDocked('bottom', false, false)).toBe(true)
    expect(isDocked('floating', false, false)).toBe(false)
    expect(isDocked('top', true, false)).toBe(false)
    expect(isDocked('top', false, true)).toBe(false)
  })
})

describe('barRoomWanted (space kept for the bar before it draws)', () => {
  it('is kept only for a bar docked at the top on a page', () => {
    expect(barRoomWanted(base)).toBe(true)
  })
  it('no room where no bar shows', () => {
    expect(barRoomWanted({ ...base, pageRoute: false })).toBe(false) // Home, Settings, Library
    expect(barRoomWanted({ ...base, v8: false })).toBe(false)
    expect(
      barRoomWanted({
        ...base,
        placement: 'floating',
        layout: barLayout('floating', false, 'both', 'same'),
      }),
    ).toBe(false) // the bar hidden
    expect(
      barRoomWanted({
        ...base,
        placement: 'free',
        layout: barLayout('free', false, 'both', 'same'),
      }),
    ).toBe(false) // floating bar
    expect(
      barRoomWanted({
        ...base,
        placement: 'bottom',
        layout: barLayout('bottom', false, 'both', 'same'),
      }),
    ).toBe(false)
    expect(barRoomWanted({ ...base, inReading: true })).toBe(false)
    expect(barRoomWanted({ ...base, autoHide: true })).toBe(false)
    expect(
      barRoomWanted({
        ...base,
        layout: barLayout('top', true, 'both', 'same'),
      }),
    ).toBe(false) // a ribbon is open: another height
  })
})
