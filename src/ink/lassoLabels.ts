import { t } from '../i18n/t'
import type { RowAction } from './lassoMenu'

/** The name of a Lasso menu action (the Lasso card and the arrange sheet). */
export function rowLabel(id: RowAction): string {
  switch (id) {
    case 'copy':
      return t('main.sel.copy')
    case 'cut':
      return t('main.sel.cut')
    case 'duplicate':
      return t('main.sel.duplicate')
    case 'convert':
      return t('ink.sel.convert')
    case 'colour':
      return t('main.sel.colour')
    case 'delete':
      return t('main.sel.delete')
    case 'thickness':
      return t('ink.sel.thickness')
    case 'makeCard':
      return t('main.sel.makeCard')
    case 'summary':
      return t('main.sel.summary')
    case 'label':
      return t('ink.sel.label')
  }
}
