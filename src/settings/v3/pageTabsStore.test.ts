// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { readPref, writePref } from '../../app/uiPrefs'
import { memoryTabSetStore } from '../../design/parts/tabSets'
import { DEFAULT_TABS_PREF } from '../../notebooks/pageTabs'
import { pageTabsStore, PAGE_TABS_SET_KEY } from './pageTabsStore'

const isList = (v: unknown): v is unknown[] => Array.isArray(v)
const pref = () => readPref(DEFAULT_TABS_PREF, isList, [])

beforeEach(() => localStorage.clear())

describe('page tabs store (the same stored value as today)', () => {
  it('starts empty when nothing is stored', () => {
    expect(
      pageTabsStore(memoryTabSetStore()).read(PAGE_TABS_SET_KEY),
    ).toBeNull()
  })

  it('a change writes the preference of optional tabs', () => {
    const s = pageTabsStore(memoryTabSetStore())
    s.write(
      PAGE_TABS_SET_KEY,
      JSON.stringify({
        ids: ['page', 'slides', 'summary', 'mindMap'],
        custom: {},
        labels: {},
      }),
    )
    expect(pref()).toEqual(['mindMap', 'slides'])
  })

  it('a preference set elsewhere wins on the next read', () => {
    const s = pageTabsStore(memoryTabSetStore())
    s.write(
      PAGE_TABS_SET_KEY,
      JSON.stringify({ ids: ['page', 'slides'], custom: {}, labels: {} }),
    )
    writePref(DEFAULT_TABS_PREF, ['audio'])
    const data = JSON.parse(s.read(PAGE_TABS_SET_KEY)!)
    expect(data.ids).toEqual(['page', 'audio'])
  })

  it('reads today’s preference when no layout is stored', () => {
    writePref(DEFAULT_TABS_PREF, ['database'])
    const data = JSON.parse(
      pageTabsStore(memoryTabSetStore()).read(PAGE_TABS_SET_KEY)!,
    )
    expect(data.ids).toEqual(['page', 'summary', 'cards', 'database'])
  })

  it('reset clears the preference', () => {
    const s = pageTabsStore(memoryTabSetStore())
    writePref(DEFAULT_TABS_PREF, ['audio'])
    s.remove(PAGE_TABS_SET_KEY)
    expect(pref()).toEqual([])
  })
})
