import { readPref, writePref } from '../../app/uiPrefs'
import {
  cleanTabs,
  DEFAULT_TABS_PREF,
  EXTRA_TABS,
  EXTRA_TAB_LABEL,
  isExtraTab,
  type ExtraTab,
} from '../../notebooks/pageTabs'
import { t } from '../../i18n/t'
import {
  localTabSetStore,
  type TabSetData,
  type TabSetStore,
} from '../../design/parts/tabSets'
import type { TabDef } from '../../design/parts/useTabSet'
import { tv } from './tv'

/** The three tabs every page has, in the order a new page starts with. */
export const CORE_TABS = ['page', 'summary', 'cards'] as const

export const PAGE_TABS_SET_KEY = 'pageTabs.default'

export const pageTabCatalog = (): TabDef[] => [
  { id: 'page', label: tv('sv3.tab.page') },
  { id: 'summary', label: tv('sv3.tab.summary') },
  { id: 'cards', label: tv('sv3.tab.cards') },
  ...EXTRA_TABS.map((id) => ({ id, label: t(EXTRA_TAB_LABEL[id]) })),
]

const isList = (v: unknown): v is unknown[] => Array.isArray(v)
const prefExtras = (): ExtraTab[] =>
  cleanTabs(readPref(DEFAULT_TABS_PREF, isList, []))

const extrasOf = (ids: readonly unknown[]): ExtraTab[] =>
  cleanTabs(ids.filter(isExtraTab))

/**
 * Settings v3 keeps the order, names and own tabs of the page-tab row on this
 * device, but WHAT new notebooks start with is still today's stored value
 * (the preference `pageTabs.default`, the optional tabs). This store joins
 * them: a change writes the preference; a preference changed elsewhere (sync,
 * today's screen) wins on the next read. Nothing is copied to a second place
 * that could disagree.
 */
export function pageTabsStore(
  base: TabSetStore = localTabSetStore,
): TabSetStore {
  return {
    read(key) {
      const pref = prefExtras()
      const text = base.read(key)
      if (!text) {
        return pref.length
          ? JSON.stringify({
              ids: [...CORE_TABS, ...pref],
              custom: {},
              labels: {},
            })
          : null
      }
      try {
        const data = JSON.parse(text) as TabSetData
        const ids = Array.isArray(data.ids) ? data.ids : []
        const mine = extrasOf(ids)
        if (mine.join() === pref.join()) return text
        // The preference changed elsewhere: keep order of the rest.
        const kept = ids.filter((id) => !isExtraTab(id))
        return JSON.stringify({ ...data, ids: [...kept, ...pref] })
      } catch {
        return null
      }
    },
    write(key, value) {
      base.write(key, value)
      try {
        const data = JSON.parse(value) as TabSetData
        writePref(DEFAULT_TABS_PREF, extrasOf(data.ids))
      } catch {
        /* a bad value is never written */
      }
    },
    remove(key) {
      base.remove(key)
      writePref(DEFAULT_TABS_PREF, [])
    },
  }
}
