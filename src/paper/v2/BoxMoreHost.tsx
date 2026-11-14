import { useId } from 'react'
import { runTask } from '../../app/errors'
import type { AnchoredMenuState } from '../../app/tools/useAnchoredMenu'
import type { LearningNotesDB } from '../../core/db'
import type { PaperBox } from '../../core/types'
import { t } from '../../i18n/t'
import type { GridInfo } from '../layoutPlan'
import { BoxMoreList, type MoreRow } from './BoxMoreList'
import { moveStep, neighbourOf } from './boxOrder'
import { bottomBar, placeList } from './listPlace'
import { MORE_LIST_W } from './BoxMoreList'

/**
 * TB-30 (switch textbox.v2): the ⋯ list of one box. Both ⋯ buttons open it:
 * the one on the Object bar and the one beside the ≡ tab. It stands in for
 * today's box menu (usePaperBoxes `menu`), so there is one list, not two.
 */
export default function BoxMoreHost({
  db,
  pageId,
  box,
  at,
  canEdit,
  getGrid,
  onClose,
  onDuplicate,
  onDelete,
  onLock,
}: {
  db: LearningNotesDB
  pageId: string
  box: PaperBox
  at: DOMRect
  canEdit: boolean
  /** The grid as drawn now (for Move up / Move down). */
  getGrid: () => GridInfo
  onClose: () => void
  onDuplicate: () => void
  onDelete: () => void
  onLock: (locked: boolean) => void
}) {
  const id = useId()
  // Beside or under the box, never over its words.
  const boxEl = document.querySelector(
    '[data-paper-box="' + CSS.escape(box.id) + '"]',
  )
  const spot = boxEl
    ? placeList(
        boxEl.getBoundingClientRect(),
        MORE_LIST_W,
        { width: window.innerWidth, height: window.innerHeight - bottomBar() },
        window.innerHeight / 2,
      )
    : null
  const menu: AnchoredMenuState = {
    at: !spot
      ? at
      : spot.above !== undefined
        ? // The shared menu opens upwards and ends 4 px above this top.
          new DOMRect(spot.right - 1, spot.above + 4, 1, 0)
        : new DOMRect(spot.right - 1, 0, 1, spot.bottom),
    opener: null,
    id,
    open: true,
    close: onClose,
    toggle: onClose,
    openAt: () => {},
    trigger: {
      'data-popup-trigger': true,
      'aria-haspopup': 'menu',
      'aria-expanded': true,
      'aria-controls': id,
    },
  }
  const rows = getGrid().rows
  const move = (step: 'up' | 'down') =>
    runTask(moveStep(db, pageId, getGrid(), box.id, step).then(() => {}))
  const locked = !!box.locked
  const groups: MoreRow[][] = [
    [
      {
        id: 'lock',
        icon: locked ? 'lockOpen' : 'lockKeyhole',
        label: locked ? t('paper.box.unlock') : t('paper.box.lock'),
        disabled: !canEdit,
        onSelect: () => onLock(!locked),
      },
      {
        id: 'duplicate',
        icon: 'copy',
        label: t('paper.box.duplicate'),
        onSelect: onDuplicate,
      },
      {
        id: 'up',
        icon: 'chevronUp',
        label: t('paper.box.moveUp'),
        disabled: !canEdit || locked || !neighbourOf(rows, box.id, 'up'),
        onSelect: () => move('up'),
      },
      {
        id: 'down',
        icon: 'chevronDown',
        label: t('paper.box.moveDown'),
        disabled: !canEdit || locked || !neighbourOf(rows, box.id, 'down'),
        onSelect: () => move('down'),
      },
    ],
    [
      // One box is picked, so Group waits for two or more (the group pill).
      {
        id: 'group',
        icon: 'layers',
        label: t('paper.group.group'),
        note: t('paper.box.groupNeed'),
        disabled: true,
        onSelect: () => {},
      },
    ],
    ...(canEdit
      ? [
          [
            {
              id: 'delete',
              icon: 'trash',
              label: t('paper.box.delete'),
              danger: true,
              onSelect: onDelete,
            } satisfies MoreRow,
          ],
        ]
      : []),
  ]
  return <BoxMoreList menu={menu} groups={groups} />
}
