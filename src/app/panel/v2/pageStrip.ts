import type { StripItem } from '../../../design/parts/ContextStrip'
import { t } from '../../../i18n/t'
import type { ProFeatureId } from '../../../settings/proFeatures.gen'

/** What decides the items of a page row's Context strip. */
export interface PageStripInput {
  /** Professional features that are on (Professional: all). */
  unlocked: (id: ProFeatureId) => boolean
  canMoveUp: boolean
  canMoveDown: boolean
}

/**
 * The strip on a page row (hold or right-click): Open, Pick, Duplicate and
 * Extract for everyone; Move up / down behind `nb.move`; Delete (red) last.
 */
export function pageStripItems(i: PageStripInput): StripItem[] {
  const items: StripItem[] = [
    { id: 'open', icon: 'arrowUpRight', label: t('lp2.act.open') },
    { id: 'pick', icon: 'checkSquare', label: t('lp2.act.pick') },
    { id: 'duplicate', icon: 'duplicate', label: t('lp2.act.duplicate') },
    { id: 'extract', icon: 'move', label: t('lp2.act.extract') },
  ]
  if (i.unlocked('nb.move')) {
    items.push(
      {
        id: 'moveUp',
        icon: 'chevronUp',
        label: t('lp2.act.moveUp'),
        disabled: !i.canMoveUp,
      },
      {
        id: 'moveDown',
        icon: 'chevronDown',
        label: t('lp2.act.moveDown'),
        disabled: !i.canMoveDown,
      },
    )
  }
  items.push({
    id: 'delete',
    icon: 'trash',
    label: t('lp2.act.delete'),
    danger: true,
  })
  return items
}
