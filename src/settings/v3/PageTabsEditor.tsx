import { useMemo, useState } from 'react'
import { TabRow } from '../../design/parts/TabRow'
import { tv } from './tv'
import {
  CORE_TABS,
  PAGE_TABS_SET_KEY,
  pageTabCatalog,
  pageTabsStore,
} from './pageTabsStore'

/**
 * SET-B28 to B30: the default page tabs. Three tabs at first (Page, Summary,
 * Cards); add, rename, remove and reorder with the shared tab row and its
 * editor (drop-line, up / down buttons, live reflow, Undo). The row is always
 * one line and scrolls sideways under a thin track. The row IS the small
 * preview of the tab row (B29). What new notebooks start with is still
 * today's stored value (see pageTabsStore).
 */
export function PageTabsEditor() {
  const store = useMemo(() => pageTabsStore(), [])
  const catalog = useMemo(() => pageTabCatalog(), [])
  const [value, setValue] = useState<string>(CORE_TABS[0])
  return (
    <section
      data-setting-id="general.pageTabs"
      aria-labelledby="sv3-pagetabs-name"
      className="sv3-row"
    >
      <div className="sv3-row-head">
        <h3 id="sv3-pagetabs-name" className="sv3-row-name">
          {tv('sv3.pageTabs.name')}
        </h3>
      </div>
      <p className="sv3-line-help">{tv('sv3.pageTabs.help')}</p>
      <div className="sv3-row-control sv3-ptabs" data-page-tabs-preview>
        <span className="sv3-ptabs-label">{tv('sv3.pageTabs.preview')}</span>
        <TabRow
          setKey={PAGE_TABS_SET_KEY}
          store={store}
          catalog={catalog}
          defaults={[...CORE_TABS]}
          value={value}
          onPick={setValue}
          label={tv('sv3.pageTabs.name')}
        />
        <p className="sv3-line-help">{tv('sv3.pageTabs.note')}</p>
      </div>
    </section>
  )
}
