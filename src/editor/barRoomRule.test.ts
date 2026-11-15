import { describe, expect, it } from 'vitest'
import { barLayout } from '../app/tools/barLayout'
import {
  barRoomHeight,
  barRoomWanted,
  isDocked,
  isRoomMap,
  roomKey,
  withRoom,
} from './barRoomRule'

const base = {
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

describe('barRoomHeight (R14: the old bar keeps its own height too)', () => {
  it('the new bar keeps its token height (null = the CSS token)', () => {
    expect(barRoomHeight(true, 44)).toBeNull()
  })
  it('the old bar: one button row plus the pill frame (10 px)', () => {
    expect(barRoomHeight(false, 44)).toBe(54)
    expect(barRoomHeight(false, 54)).toBe(64)
    expect(barRoomHeight(false, 30)).toBe(54) // never under finger size
  })
  it('a height measured on this screen wins', () => {
    expect(barRoomHeight(false, 44, 128)).toBe(128)
    expect(barRoomHeight(true, 44, 128)).toBeNull() // the new bar keeps its token
  })
  it('keys by button size and width; keeps 8 screens', () => {
    expect(roomKey(30, 390.4)).toBe('44@390')
    let m = {}
    for (let i = 0; i < 10; i++) m = withRoom(m, 'k' + i, 50 + i)
    expect(Object.keys(m)).toHaveLength(8)
    expect(m).toHaveProperty('k9', 59)
    expect(isRoomMap(m)).toBe(true)
    expect(isRoomMap({ a: 'x' })).toBe(false)
    expect(isRoomMap([1])).toBe(false)
  })
})
