import {
  lassoSettings,
  type LassoSettings,
  type LassoShape,
} from '../../../main/inkSettings'
import {
  lassoRow,
  setRowAction,
  type RowAction,
} from '../../../../../ink/lassoMenu'
import type { IconName } from '../../../icons'
import type { MessageKey } from '../../../../../i18n/t'

/** Logic of the Lasso cards (1d, TB-32). Writes `ink.lasso` and the menu row. */

export const setLassoShape = (shape: LassoShape): void =>
  lassoSettings.update({ shape })

export type LassoFilter = 'ink' | 'pictures' | 'text'
export const LASSO_FILTERS: readonly [LassoFilter, IconName][] = [
  ['ink', 'pen'],
  ['pictures', 'image'],
  ['text', 'type'],
]

export const setLassoFilter = (key: LassoFilter, on: boolean): void =>
  lassoSettings.update({ [key]: on } as Partial<LassoSettings>)

/** What a selection can do, as the plain list in the card (Beginner too). */
export const LASSO_ACTIONS: readonly { id: string; icon: IconName }[] = [
  { id: 'cut', icon: 'scissors' },
  { id: 'copy', icon: 'copy' },
  { id: 'paste', icon: 'clipboard' },
  { id: 'duplicate', icon: 'duplicate' },
  { id: 'colour', icon: 'palette' },
  { id: 'resize', icon: 'scale' },
  { id: 'delete', icon: 'trash' },
]

export const actionLabel = (id: string): MessageKey =>
  `main.sel.${id}` as MessageKey

/** Which actions sit in the menu row (Pro): switch one on or off. */
export const toggleRowAction = (a: RowAction): void =>
  setRowAction(a, !lassoRow.get().includes(a))
