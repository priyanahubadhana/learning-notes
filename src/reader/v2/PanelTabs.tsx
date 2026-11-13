import { useEffect, useMemo } from 'react'
import { TabRow, type TabDef } from '../../design/parts/TabRow'
import { t } from '../../i18n/t'
import { useReaderSwitch } from './proSwitches'

/** The reader tab row a new user sees; Audio waits under the + (RD-B34). Pages joins the default row with reader.pagesTab (RD-P20). */
const BOOK_DEFAULTS = ['pages', 'outline', 'annotations']
const BOOK_DEFAULTS_NO_PAGES = ['outline', 'annotations']

/**
 * Reader v2 (slice 7e): the left panel's tab row for an open book. One line
 * with a + (add, rename, reorder, remove); the choice is a saved setting.
 * Loaded only when a book is open with the flag on.
 */
export default function PanelTabs({
  value,
  onPick,
}: {
  value: string
  onPick: (id: string) => void
}) {
  const pagesOn = useReaderSwitch('reader.pagesTab')
  const resourcesOn = useReaderSwitch('reader.resourcesTab')
  // Pages is off by default: land on Contents instead (the tab can still be added with +).
  useEffect(() => {
    if (!pagesOn && value === 'pages') onPick('outline')
  }, [pagesOn, value, onPick])
  const catalog = useMemo<TabDef[]>(
    () => [
      { id: 'pages', label: t('lp.tab.pages') },
      { id: 'outline', label: t('lp.tab.outline') },
      { id: 'annotations', label: t('bookpanel.tab.annotations') },
      ...(resourcesOn ? [{ id: 'audio', label: t('lp.tab.audio') }] : []),
    ],
    [resourcesOn],
  )
  return (
    <TabRow
      setKey="reader.panel"
      catalog={catalog}
      defaults={pagesOn ? BOOK_DEFAULTS : BOOK_DEFAULTS_NO_PAGES}
      value={value}
      onPick={onPick}
      variant="pill"
      label={t('lp.label')}
      sources={() => [{ id: 'notes', label: t('bookpanel.tab.annotations') }]}
    />
  )
}
