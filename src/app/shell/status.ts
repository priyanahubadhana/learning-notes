import { t } from '../../i18n/t'

export interface StatusInput {
  /** Something could not be saved yet. */
  unsaved: boolean
  /** Words for a state the sync layer wants shown (offline), or null. */
  syncLabel: string | null
  /** A page is open for writing. */
  editing: boolean
}

/**
 * SH-04: the quiet status in the top bar. A failed save comes first, then
 * the sync state; while a page is open and everything is stored it reads
 * "Saved".
 */
export function statusFor(i: StatusInput): string | null {
  if (i.unsaved) return t('shell.notSaved')
  if (i.syncLabel) return i.syncLabel
  return i.editing ? t('shell.saved') : null
}
