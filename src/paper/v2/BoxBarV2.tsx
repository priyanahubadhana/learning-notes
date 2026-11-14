import { useContext, useEffect, useRef } from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import { useAnchoredMenu } from '../../app/tools/useAnchoredMenu'
import type { LearningNotesDB } from '../../core/db'
import type { PaperBox } from '../../core/types'
import { ObjectBar, type ObjectBarAction } from '../../design/parts/ObjectBar'
import { t } from '../../i18n/t'
import { boxEditors } from '../activeBox'
import { openBoxStyle } from '../boxStyleBus'
import type { GridInfo } from '../layoutPlan'
import { BoxMoreList, type MoreRow } from './BoxMoreList'
import { moveStep, neighbourOf } from './boxOrder'

/** All the text of a box as plain lines (no focus change, so the bar stays). */
function boxText(pageId: string, boxId: string): string {
  const view = boxEditors.get(pageId, boxId)?.prosemirrorView
  if (!view) return ''
  const doc = view.state.doc
  return doc.textBetween(0, doc.content.size, '\n', ' ')
}

/** The bar never gets nearer than this to the top of the screen (px). */
const SAFE_TOP = 12

/**
 * TB-24, TB-30, TB-31 (switch textbox.v2): the one Object bar over a selected
 * box (Cut, Copy, Duplicate, Delete, Box style, ⋯) and its ⋯ list. It copies
 * today's BoxBar (BoxBar.tsx) action for action, on the shared Object bar.
 */
export default function BoxBarV2({
  db,
  pageId,
  box,
  canEdit,
  getGrid,
  onDuplicate,
  onDelete,
  onLock,
}: {
  db: LearningNotesDB
  pageId: string
  box: PaperBox
  canEdit: boolean
  /** The grid as drawn now (for Move up / Move down). */
  getGrid: () => GridInfo
  onDuplicate: () => void
  onDelete: () => void
  onLock: (locked: boolean) => void
}) {
  const { toast } = useContext(AppUiContext)
  const menu = useAnchoredMenu()
  const wrap = useRef<HTMLDivElement>(null)

  // The safe top zone: a box scrolled to the top of the screen must not drag
  // the bar into the top 12 px. Watched with an observer (no scroll listener).
  useEffect(() => {
    const el = wrap.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const fit = () => {
      el.style.translate = '0 0'
      const top = el.getBoundingClientRect().top
      if (top < SAFE_TOP) el.style.translate = `0 ${SAFE_TOP - top}px`
    }
    fit()
    const io = new IntersectionObserver(fit, {
      rootMargin: `-${SAFE_TOP}px 0px 0px 0px`,
      threshold: Array.from({ length: 21 }, (_, i) => i / 20),
    })
    io.observe(el)
    return () => io.disconnect()
  })

  /** Copies the text; says so when the clipboard refuses. */
  const copy = async (): Promise<boolean> => {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard')
      await navigator.clipboard.writeText(boxText(pageId, box.id))
      return true
    } catch {
      toast(t('paper.box.copyFailed'))
      return false
    }
  }
  // Cut removes the box only after the copy worked: a blocked clipboard
  // must never turn Cut into a plain delete of the owner's text.
  const cut = () => void copy().then((ok) => ok && onDelete())

  const actions: ObjectBarAction[] = [
    ...(canEdit
      ? [{ id: 'cut', icon: 'scissors', label: t('pic.act.cut') } as const]
      : []),
    { id: 'copy', icon: 'clipboard', label: t('pic.act.copy') },
    { id: 'duplicate', icon: 'copy', label: t('paper.box.duplicate') },
    ...(canEdit
      ? ([
          {
            id: 'delete',
            icon: 'trash',
            label: t('paper.box.delete'),
            danger: true,
          },
          { id: 'style', icon: 'palette', label: t('boxStyle.title') },
        ] as const)
      : []),
    { id: 'boxmore', icon: 'more', label: t('paper.box.menu') },
  ]

  const openMore = () => {
    const btn = wrap.current?.querySelector<HTMLElement>(
      '[data-testid="ob-boxmore"]',
    )
    if (!btn) return
    if (menu.open) menu.close()
    else menu.openAt(btn)
  }
  // The ⋯ button is a trigger of its list (a press on it toggles the list).
  useEffect(() => {
    wrap.current
      ?.querySelector('[data-testid="ob-boxmore"]')
      ?.setAttribute('data-popup-trigger', '')
  })

  const onAction = (id: string) => {
    if (id === 'cut') cut()
    else if (id === 'copy') void copy()
    else if (id === 'duplicate') onDuplicate()
    else if (id === 'delete') onDelete()
    else if (id === 'style') openBoxStyle(box.id)
    else if (id === 'boxmore') openMore()
  }

  const rows = getGrid().rows
  const move = (step: 'up' | 'down') =>
    runTask(moveStep(db, pageId, getGrid(), box.id, step).then(() => {}))
  const groups: MoreRow[][] = [
    [
      {
        id: 'lock',
        icon: box.locked ? 'lockOpen' : 'lockKeyhole',
        label: box.locked ? t('paper.box.unlock') : t('paper.box.lock'),
        disabled: !canEdit,
        onSelect: () => onLock(!box.locked),
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
        disabled: !canEdit || !!box.locked || !neighbourOf(rows, box.id, 'up'),
        onSelect: () => move('up'),
      },
      {
        id: 'down',
        icon: 'chevronDown',
        label: t('paper.box.moveDown'),
        disabled:
          !canEdit || !!box.locked || !neighbourOf(rows, box.id, 'down'),
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

  return (
    <div ref={wrap} data-box-bar data-ui>
      <ObjectBar kind="box" actions={actions} onAction={onAction} />
      <BoxMoreList menu={menu} groups={groups} />
    </div>
  )
}
