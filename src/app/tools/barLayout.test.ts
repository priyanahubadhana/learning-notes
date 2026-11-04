import { describe, expect, it } from 'vitest'
import { BAR_PLACEMENTS } from '../deviceMode'
import { barGroups, barLayout } from './barLayout'
import { PLACES, RIBBON_MODES, type RibbonPlace } from './toolbarState'

const RIBBON_PLACES: RibbonPlace[] = ['same', ...PLACES]

describe('which bars show and where', () => {
  it('Off (the older "floating") shows no bar at all, not even the ribbon', () => {
    for (const open of [false, true]) {
      expect(barLayout('floating', open, 'both', 'top')).toEqual({
        short: null,
        ribbon: null,
      })
    }
  })

  it('without the ribbon, only the short bar shows, where it sits', () => {
    for (const place of PLACES) {
      expect(barLayout(place, false, 'both', 'bottom')).toEqual({
        short: place,
        ribbon: null,
      })
    }
  })

  it('"Ribbon replaces short bar" shows only the ribbon', () => {
    for (const place of PLACES) {
      expect(barLayout('top', true, 'replace', place).short).toBeNull()
    }
    // "same" follows the short bar's position.
    expect(barLayout('bottom', true, 'replace', 'same').ribbon).toBe('bottom')
    expect(barLayout('top', true, 'replace', 'free').ribbon).toBe('free')
  })

  it('"Ribbon + short bar" shows both, each at its own position', () => {
    expect(barLayout('top', true, 'both', 'bottom')).toEqual({
      short: 'top',
      ribbon: 'bottom',
    })
    expect(barLayout('free', true, 'both', 'same')).toEqual({
      short: 'free',
      ribbon: 'free',
    })
  })

  it('every combination: bars on the same edge share one stack (never overlap)', () => {
    let checked = 0
    for (const short of BAR_PLACEMENTS) {
      for (const open of [false, true]) {
        for (const mode of RIBBON_MODES) {
          for (const place of RIBBON_PLACES) {
            const layout = barLayout(short, open, mode, place)
            const groups = barGroups(layout)
            const total =
              groups.top.length + groups.bottom.length + groups.free.length
            expect(total).toBe((layout.short ? 1 : 0) + (layout.ribbon ? 1 : 0))
            // One group per place: a place holds both bars or one of them.
            for (const key of PLACES) {
              expect(new Set(groups[key]).size).toBe(groups[key].length)
              // Stacked with the ribbon above the short bar.
              if (groups[key].length === 2) {
                expect(groups[key]).toEqual(['ribbon', 'short'])
              }
            }
            checked++
          }
        }
      }
    }
    expect(checked).toBe(BAR_PLACEMENTS.length * 2 * 2 * 4)
  })

  it('both bars on the same edge are one stack of two', () => {
    expect(barGroups(barLayout('top', true, 'both', 'top')).top).toEqual([
      'ribbon',
      'short',
    ])
    expect(barGroups(barLayout('top', true, 'both', 'bottom'))).toEqual({
      top: ['short'],
      bottom: ['ribbon'],
      free: [],
    })
  })
})
