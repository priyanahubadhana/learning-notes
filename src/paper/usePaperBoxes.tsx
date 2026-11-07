import { useContext, useState, type ReactNode } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { activeTool } from '../app/tools/main/mainTools'
import { MenuPopover, type MenuItem } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import type { PaperBox } from '../core/types'
import { t } from '../i18n/t'
import {
  addBox,
  duplicateBox,
  removeBox,
  restoreBox,
  updateBox,
} from './boxService'

/** Box colours (the highlight colours). */
export const BOX_COLOURS: Record<string, string> = {
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  pink: '#ec4899',
  purple: '#a855f7',
}

const DOTS: Record<string, string> = {
  yellow: '🟡',
  green: '🟢',
  blue: '🔵',
  pink: '🩷',
  purple: '🟣',
}

/**
 * Phase Q step 3: what the paper does with boxes on one page: a Text-tool
 * tap on empty paper makes one (the caret goes in), the grip and edges move
 * and resize it, and its ⋯ menu locks, duplicates, colours or deletes it.
 */
export function usePaperBoxes(
  db: LearningNotesDB,
  pageId: string,
  editable: boolean,
): {
  onAddBox?: (at: { x: number; y: number }) => void
  onBoxChange: (id: string, patch: Partial<PaperBox>) => void
  onBoxMenu: (box: PaperBox, at: DOMRect) => void
  /** The box made just now (its editor takes the caret). */
  fresh: string | null
  menu: ReactNode
} {
  const { toast } = useContext(AppUiContext)
  const [fresh, setFresh] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<{
    box: PaperBox
    at: DOMRect
  } | null>(null)

  const onAddBox = (at: { x: number; y: number }) => {
    if (activeTool.get() !== 'text') return
    runTask(addBox(db, pageId, at).then(setFresh))
  }
  const onBoxChange = (id: string, patch: Partial<PaperBox>) =>
    runTask(updateBox(db, pageId, id, patch))

  const items = (box: PaperBox): MenuItem[] => [
    {
      label: t(box.locked ? 'paper.box.unlock' : 'paper.box.lock'),
      icon: box.locked ? '🔓' : '🔒',
      onSelect: () =>
        onBoxChange(box.id, { locked: box.locked ? undefined : true }),
    },
    {
      label: t('paper.box.duplicate'),
      icon: '⧉',
      onSelect: () =>
        runTask(
          duplicateBox(db, pageId, box.id).then((id) => id && setFresh(id)),
        ),
    },
    {
      label: t('paper.box.colour'),
      icon: '🎨',
      onSelect: () => {},
      submenu: [
        ...Object.keys(BOX_COLOURS).map((name): MenuItem => ({
          label: DOTS[name] ?? name,
          icon: DOTS[name] ?? '●',
          checked: box.colour === name,
          onSelect: () => onBoxChange(box.id, { colour: name }),
        })),
        {
          label: t('paper.box.noColour'),
          icon: '○',
          checked: !box.colour,
          onSelect: () => onBoxChange(box.id, { colour: undefined }),
        },
      ],
    },
    {
      label: t('paper.box.delete'),
      icon: '🗑',
      danger: true,
      onSelect: () =>
        runTask(
          removeBox(db, pageId, box.id).then((removed) => {
            if (!removed) return
            toast(t('paper.box.deleted'), {
              label: t('paper.box.undo'),
              onSelect: () => runTask(restoreBox(db, pageId, removed)),
            })
          }),
        ),
    },
  ]

  return {
    onAddBox: editable ? onAddBox : undefined,
    onBoxChange,
    onBoxMenu: (box, at) => setMenuFor({ box, at }),
    fresh,
    menu: menuFor && (
      <MenuPopover
        anchor={menuFor.at}
        items={items(menuFor.box)}
        onClose={() => setMenuFor(null)}
      />
    ),
  }
}
