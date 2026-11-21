import {
  lassoSettings,
  type LassoSettings,
  type LassoShape,
} from '../../../main/inkSettings'
import {
  lassoRow,
  setRow,
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
  { id: 'copy', icon: 'copyPage' },
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

/** The icon of each menu-row action (mock v9). */
export const ROW_ICON: Record<RowAction, IconName> = {
  copy: 'copyPage',
  cut: 'scissors',
  duplicate: 'duplicate',
  convert: 'type',
  colour: 'palette',
  delete: 'trash',
  thickness: 'sliders',
  makeCard: 'cards',
  summary: 'fileText',
  label: 'tag',
}

/** Moves an action one place earlier (-1) or later (+1) in the row; the edges stay. */
export function moveRowAction(a: RowAction, by: -1 | 1): void {
  const row = [...lassoRow.get()]
  const i = row.indexOf(a)
  const j = i + by
  if (i < 0 || j < 0 || j >= row.length) return
  ;[row[i], row[j]] = [row[j], row[i]]
  setRow(row)
}
