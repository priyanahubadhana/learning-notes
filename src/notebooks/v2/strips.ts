import type { StripItem } from '../../design/parts/ContextStrip'
import type { ProFeatureId } from '../../settings/proFeatures.gen'
import { tn } from './tn'

/** What decides the items of a notebook's Context menu strip. */
export interface NotebookStripInput {
  starred: boolean
  /** The cover is the first page (not a colour). */
  coverIsPage: boolean
  /** Professional features that are on (Professional: all). */
  unlocked: (id: ProFeatureId) => boolean
  canMoveUp: boolean
  canMoveDown: boolean
  /** Duplicate is offered only when a service for it exists. */
  canDuplicate?: boolean
}

/**
 * NB-B08 / NB-P03 / NB-P05..P07: the strip on a notebook cover or row.
 * Open, Pin, Rename, Cover and settings first; the Professional extras next
 * (each behind its own switch); Duplicate; Delete (red) always last.
 */
export function notebookStripItems(i: NotebookStripInput): StripItem[] {
  const items: StripItem[] = [
    { id: 'open', icon: 'arrowUpRight', label: tn('nbv2.act.open') },
    {
      id: 'pin',
      icon: i.starred ? 'pinOff' : 'pin',
      label: tn(i.starred ? 'nbv2.act.unpin' : 'nbv2.act.pin'),
    },
    { id: 'rename', icon: 'pencil', label: tn('nbv2.act.rename') },
    {
      id: 'cover',
      icon: 'palette',
      label: tn('nbv2.act.cover'),
      menu: [
        i.coverIsPage
          ? { id: 'colour', label: tn('nbv2.act.coverColour') }
          : { id: 'page', label: tn('nbv2.act.coverPage') },
        { id: 'next', label: tn('nbv2.act.colourNext') },
      ],
    },
  ]
  if (i.unlocked('nb.addEmptyPage'))
    items.push({
      id: 'addPage',
      icon: 'filePlus',
      label: tn('nbv2.act.addPage'),
    })
  if (i.unlocked('nb.addFromTemplate'))
    items.push({
      id: 'addTemplate',
      icon: 'template',
      label: tn('nbv2.act.addTemplate'),
    })
  if (i.unlocked('nb.reviewNotebook'))
    items.push({ id: 'review', icon: 'cards', label: tn('nbv2.act.review') })
  if (i.unlocked('nb.move')) {
    items.push(
      {
        id: 'moveTop',
        icon: 'chevronUp',
        label: tn('nbv2.act.moveTop'),
        disabled: !i.canMoveUp,
      },
      {
        id: 'moveUp',
        icon: 'chevronUp',
        label: tn('nbv2.act.moveUp'),
        disabled: !i.canMoveUp,
      },
      {
        id: 'moveDown',
        icon: 'chevronDown',
        label: tn('nbv2.act.moveDown'),
        disabled: !i.canMoveDown,
      },
    )
  }
  if (i.canDuplicate)
    items.push({
      id: 'duplicate',
      icon: 'duplicate',
      label: tn('nbv2.act.duplicate'),
    })
  items.push({
    id: 'delete',
    icon: 'trash',
    label: tn('nbv2.act.delete'),
    danger: true,
  })
  return items
}
