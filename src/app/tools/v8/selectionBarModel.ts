import { isUnlocked } from '../../../settings/level'
import type { ProFeatureId } from '../../../settings/proFeatures.gen'
import type { MessageKey } from '../../../i18n/t'
import type { IconName } from '../icons'

/**
 * What the selection bar offers (TB-33). Same ids and names as today's
 * selection menu (`main.sel.*`), so no action is renamed or dropped.
 */

export const BAR_ACTIONS = [
  'cut',
  'copy',
  'paste',
  'duplicate',
  'colour',
  'resize',
  'delete',
] as const

export const MORE_BEGINNER = ['deselect'] as const
export const MORE_PRO = [
  'convert',
  'screenshot',
  'keyPoint',
  'makeCard',
  'summary',
  'saveToNotes',
  'move',
  'scale',
  'rotate',
] as const

export interface BarItem {
  id: string
  icon: IconName
  label: MessageKey
}

const ICON: Record<string, IconName> = {
  cut: 'scissors',
  copy: 'copyPage',
  paste: 'clipboard',
  duplicate: 'duplicate',
  colour: 'palette',
  resize: 'scale',
  delete: 'trash',
  deselect: 'close',
  convert: 'type',
  screenshot: 'screenshot',
  keyPoint: 'star',
  makeCard: 'cards',
  summary: 'fileText',
  saveToNotes: 'notebook',
  move: 'move',
  scale: 'scale',
  rotate: 'rotate',
}

const item = (id: string): BarItem => ({
  id,
  icon: ICON[id],
  label: `main.sel.${id}` as MessageKey,
})

export const barItems = (): BarItem[] => BAR_ACTIONS.map(item)

/** The ⋯ list: Deselect, plus the nine more when unlocked (`tb.selectionMenu`). */
export function moreItems(
  unlocked: (id: ProFeatureId) => boolean = isUnlocked,
): BarItem[] {
  const ids: readonly string[] = unlocked('tb.selectionMenu')
    ? [...MORE_PRO, ...MORE_BEGINNER]
    : MORE_BEGINNER
  return ids.map(item)
}
