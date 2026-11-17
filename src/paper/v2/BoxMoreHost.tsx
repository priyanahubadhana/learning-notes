import { useContext, useId } from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import type { AnchoredMenuState } from '../../app/tools/useAnchoredMenu'
import type { LearningNotesDB } from '../../core/db'
import type { PaperBox } from '../../core/types'
import { t } from '../../i18n/t'
import type { GridInfo } from '../layoutPlan'
import { BoxMoreList, type MoreRow } from './BoxMoreList'
import { moveStep, neighbourOf } from './boxOrder'
import { placeClear } from '../../app/menuPlace'
import {
  barRects,
  bottomBar,
  boxWithBar,
  frameOfBox,
  LIST_H,
  placeList,
} from './listPlace'
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
  const { toast } = useContext(AppUiContext)
  // Beside or under the box, never over its words.
  const boxEl = document.querySelector(
    '[data-paper-box="' + CSS.escape(box.id) + '"]',
  )
  const frame = boxEl ? frameOfBox(boxEl) : undefined
  // C23 review: on a paper sheet the list sits wholly inside the sheet or
  // wholly outside it (never across its top or bottom edge), clear of the box
  // and each of its bars, a little shorter when room is tight.
  const sheetSpot =
    boxEl && frame?.top !== undefined
      ? placeClear(
          { w: MORE_LIST_W, h: LIST_H, minH: 220 },
          { x: boxEl.getBoundingClientRect().right + 8, y: frame.top },
          {
            left: 0,
            top: 0,
            right: window.innerWidth,
            bottom: window.innerHeight - bottomBar(),
          },
          frame,
          [boxWithBar(boxEl), ...barRects(), boxEl.getBoundingClientRect()],
        )
      : null
  const spot = sheetSpot
    ? null
    : boxEl
      ? placeList(
          boxWithBar(boxEl),
          MORE_LIST_W,
          {
            width: window.innerWidth,
            height: window.innerHeight - bottomBar(),
          },
          window.innerHeight / 2,
          frame,
        )
      : null
  const menu: AnchoredMenuState = {
    at: sheetSpot
      ? // Opens downwards from this top, its right edge here.
        new DOMRect(sheetSpot.x + MORE_LIST_W - 1, 0, 1, sheetSpot.y - 4)
      : !spot
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
        dim: true,
        onSelect: () => toast(t('paper.box.groupTip')),
      },
    ],
  ]
  // C23: Delete box stays in view under the scrolling rows, never scrolled away.
  const footer: MoreRow[] = canEdit
    ? [
        {
          id: 'delete',
          icon: 'trash',
          label: t('paper.box.delete'),
          danger: true,
          onSelect: onDelete,
        },
      ]
    : []
  return (
    <BoxMoreList
      menu={menu}
      groups={groups}
      footer={footer}
      bottomReserve={
        sheetSpot
          ? Math.max(0, window.innerHeight - sheetSpot.y - 8 - sheetSpot.h)
          : undefined
      }
    />
  )
}
