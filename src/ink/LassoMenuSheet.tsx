import { t } from '../i18n/t'
import { EditListSheet, type SheetItem } from '../app/tools/EditListSheet'
import {
  DEFAULT_ROW,
  lassoRow,
  lassoSheetOpen,
  ROW_ACTIONS,
  setRow,
} from './lassoMenu'
import { rowLabel } from './lassoLabels'

/**
 * Arrange the Lasso menu (polish 2, item 6): the same sheet as Edit toolbar.
 * The list is the icons in the menu row, in order; "More" is what waits
 * under ⋯ More. Lazy-loaded (see App).
 */
export function LassoMenuSheet() {
  const items: SheetItem[] = ROW_ACTIONS.map((id) => ({
    id,
    label: rowLabel(id),
  }))
  const close = () => lassoSheetOpen.set(false)
  return (
    <EditListSheet
      scope="lasso"
      title={t('lassoMenu.title')}
      hint={t('lassoMenu.hint')}
      items={items}
      value={lassoRow.get()}
      defaults={DEFAULT_ROW}
      canRemove={() => true}
      onCommit={setRow}
      onClose={close}
    />
  )
}
