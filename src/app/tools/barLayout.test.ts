import { describe, expect, it } from 'vitest'
import { BAR_PLACEMENTS, DEVICE_MODES, MODE_PRESETS } from '../deviceMode'
import { showBarButtonFor } from './toolbarVisibility'
import { TABS } from './tabs'
import { barGroups, barLayout } from './barLayout'
import {
  PLACES,
  RIBBON_MODES,
  visibleTabs,
  type RibbonPlace,
} from './toolbarState'

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

describe('a bar or the Show tool bar button is always there (batch 2f)', () => {
  it('holds for every mode, placement, ribbon state and ribbon place', () => {
    for (const mode of DEVICE_MODES) {
      for (const placement of [
        MODE_PRESETS[mode].placement,
        ...BAR_PLACEMENTS,
      ]) {
        for (const open of [false, true]) {
          for (const ribbonMode of RIBBON_MODES) {
            for (const place of RIBBON_PLACES) {
              const layout = barLayout(placement, open, ribbonMode, place)
              const shown = layout.short !== null || layout.ribbon !== null
              expect(
                shown || showBarButtonFor(placement),
                `${mode} ${placement} ribbon=${open}/${ribbonMode}/${place}`,
              ).toBe(true)
              // Never both: the button only stands in for a missing bar.
              expect(shown && showBarButtonFor(placement)).toBe(false)
            }
          }
        }
      }
    }
  })
  it('no mode preset starts with the bar off', () => {
    for (const mode of DEVICE_MODES) {
      expect(MODE_PRESETS[mode].placement).not.toBe('floating')
    }
  })
  it('hiding tabs always leaves a tab, so an open ribbon is never empty', () => {
    expect(visibleTabs([...TABS])).toEqual([...TABS])
    expect(visibleTabs([]).length).toBe(TABS.length)
    expect(visibleTabs(TABS.slice(1)).length).toBe(1)
  })
})
