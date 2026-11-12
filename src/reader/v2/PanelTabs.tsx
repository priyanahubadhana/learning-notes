import { useMemo } from 'react'
import { TabRow, type TabDef } from '../../design/parts/TabRow'
import { t } from '../../i18n/t'

/** The reader tab row a new user sees; Audio waits under the + (RD-B34). */
const BOOK_DEFAULTS = ['pages', 'outline', 'annotations']

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
  const catalog = useMemo<TabDef[]>(
    () => [
      { id: 'pages', label: t('lp.tab.pages') },
      { id: 'outline', label: t('lp.tab.outline') },
      { id: 'annotations', label: t('bookpanel.tab.annotations') },
      { id: 'audio', label: t('lp.tab.audio') },
    ],
    [],
  )
  return (
    <TabRow
      setKey="reader.panel"
      catalog={catalog}
      defaults={BOOK_DEFAULTS}
      value={value}
      onPick={onPick}
      variant="pill"
      label={t('lp.label')}
      sources={() => [{ id: 'notes', label: t('bookpanel.tab.annotations') }]}
    />
  )
}
