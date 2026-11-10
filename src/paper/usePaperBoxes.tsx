import { undoSince } from '../core/historySteps'
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { activeTool } from '../app/tools/main/mainTools'
import { MenuPopover, type MenuItem } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import type { GridRow, PaperBox } from '../core/types'
import { triggerFirstUse } from '../help/firstUse'
import { t, type MessageKey } from '../i18n/t'
import { BOX_COLOURS } from './boxes'
import { PRESETS } from './grid'
import {
  addBox,
  addBoxInOrder,
  addBoxWithLines,
  applyBoxLayout,
  restoreGrid,
  updateGrid,
  type BoxPatch,
  type GridBefore,
  repairBoxes,
  removeIfEmptyBox,
  duplicateBox,
  removeBox,
  restoreBox,
  updateBox,
  updateBoxes,
} from './boxService'
import type { BoxChange } from './PaperFrame'
import { BoxBar } from './BoxBar'
import { clearPageWide, pageWideClip, pageWideRange } from './pageWide'

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
/** The time an action starts (a toast's Undo checks nothing newer happened). */
const stamp = (): number => Date.now()

export function usePaperBoxes(
  db: LearningNotesDB,
  pageId: string,
  editable: boolean,
): {
  onAddBox?: (at: { x: number; y: number; row?: number }) => void
  /** Phones: a new box in the reading order (after a box id, 'start' or 'end'). */
  onAddBoxInOrder?: (after: string) => void
  onBoxChange: (id: string, patch: Partial<PaperBox>) => void
  /** Several boxes moved by one drop: one write, and Undo when more than one. */
  onBoxesChange: (changes: BoxChange[]) => void
  /** The grid changed (a drop, a divider): one write, with Undo. */
  onGridChange: (rows: GridRow[], places: BoxPatch[]) => void
  /** The paper tells the hook the grid as drawn now: for ⋯ › Layout. */
  onGridView: (rows: GridRow[], places: BoxPatch[]) => void
  onBoxMenu: (box: PaperBox, at: DOMRect) => void
  onDeleteBox: (box: PaperBox) => void
  /** The floating bar under a selected box. */
  renderBar: (box: PaperBox) => ReactNode
  onInkOnPaper?: (
    at: { x: number; y: number; w: number },
    lines: number,
  ) => Promise<string | null>
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

  // Page repair on open: an empty box on top of another one goes.
  useEffect(() => {
    if (editable) runTask(repairBoxes(db, pageId).then(() => {}))
  }, [db, pageId, editable])

  // Item 6/9: an accidental box left empty is removed when the caret leaves
  // it (a short wait first: the caret may be moving to its own bar or menu).
  useEffect(() => {
    if (!editable) return
    const BOX = '[data-paper-box]:not([data-paper-box="main"])'
    const out = (e: FocusEvent) => {
      const box = (e.target as Element | null)?.closest?.(BOX)
      const id = box?.getAttribute('data-paper-box')
      if (!box || !id) return
      if (box.contains(e.relatedTarget as Node | null)) return
      window.setTimeout(() => {
        const live = document.querySelector(
          '[data-paper-box="' + CSS.escape(id) + '"]',
        )
        if (!live || live.contains(document.activeElement)) return
        if (live.hasAttribute('data-picked')) return
        // Focus on a bar button or field (the user is setting up the box): keep it.
        if (
          document.activeElement?.closest(
            'button, input, select, textarea, [role="menu"]',
          )
        )
          return
        runTask(removeIfEmptyBox(db, pageId, id).then(() => {}))
      }, 600)
    }
    document.addEventListener('focusout', out, true)
    return () => document.removeEventListener('focusout', out, true)
  }, [db, pageId, editable])

  // Cut and Delete of a page-wide selection (Ctrl+A, third step): every box
  // is emptied at once; the toast's Undo puts it all back.
  useEffect(() => {
    if (!editable) return
    const clear = () => {
      const undo = clearPageWide()
      toast(t('paper.pageCleared'), {
        label: t('paper.box.undo'),
        onSelect: undo,
      })
    }
    const onCut = (e: ClipboardEvent) => {
      const range = pageWideRange()
      if (!range || !e.clipboardData) return
      const clip = pageWideClip(range)
      e.clipboardData.setData('text/plain', clip.text)
      e.clipboardData.setData('text/html', clip.html)
      e.preventDefault()
      clear()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (!pageWideRange()) return
      e.preventDefault()
      e.stopPropagation()
      clear()
    }
    document.addEventListener('cut', onCut, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('cut', onCut, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [editable, toast])

  const gridView = useRef<{ rows: GridRow[]; places: BoxPatch[] }>({
    rows: [],
    places: [],
  })
  const undoGrid = (before: GridBefore | null) => {
    if (!before) return
    toast(t('layout.done'), {
      label: t('paper.box.undo'),
      onSelect: () => runTask(restoreGrid(db, pageId, before)),
    })
  }
  const onGridChange = (rows: GridRow[], places: BoxPatch[]) =>
    runTask(updateGrid(db, pageId, rows, places).then(undoGrid))
  const onLayout = (box: PaperBox, presetId: string) =>
    runTask(
      applyBoxLayout(
        db,
        pageId,
        box.id,
        presetId,
        gridView.current.rows,
        gridView.current.places,
      ).then(undoGrid),
    )
  const onAddBox = (at: { x: number; y: number; row?: number }) => {
    if (activeTool.get() !== 'text') return
    triggerFirstUse('paperBox')
    runTask(addBox(db, pageId, at).then(setFresh))
  }
  const onAddBoxInOrder = (after: string) => {
    triggerFirstUse('paperBox')
    runTask(addBoxInOrder(db, pageId, after).then(setFresh))
  }
  const onBoxChange = (id: string, patch: Partial<PaperBox>) =>
    runTask(updateBox(db, pageId, id, patch))

  const onBoxesChange = (changes: BoxChange[]) => {
    const since = stamp()
    runTask(
      updateBoxes(
        db,
        pageId,
        changes.map(({ id, patch }) => ({ id, patch })),
      ).then(() => {
        if (changes.length < 2) return
        toast(t('paper.box.movedMany', { n: String(changes.length) }), {
          label: t('paper.box.undo'),
          onSelect: () =>
            undoOr(since, () =>
              runTask(
                updateBoxes(
                  db,
                  pageId,
                  changes.map(({ id, before }) => ({ id, patch: before })),
                ),
              ),
            ),
        })
      }),
    )
  }

  /** A toast's Undo: the page's history if the action is its newest step. */
  const undoOr = (since: number, fallback: () => void) =>
    void undoSince(since).then((ok) => {
      if (!ok) fallback()
    })

  const duplicate = (box: PaperBox) =>
    runTask(duplicateBox(db, pageId, box.id).then((id) => id && setFresh(id)))
  const remove = (box: PaperBox) => {
    const since = stamp()
    return runTask(
      removeBox(db, pageId, box.id).then((removed) => {
        if (!removed) return
        toast(t('paper.box.deleted'), {
          label: t('paper.box.undo'),
          onSelect: () =>
            undoOr(since, () => runTask(restoreBox(db, pageId, removed))),
        })
      }),
    )
  }

  const items = (box: PaperBox): MenuItem[] => [
    {
      label: t(box.locked ? 'paper.box.unlock' : 'paper.box.lock'),
      icon: box.locked ? 'lockOpen' : 'lock',
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
      icon: 'palette',
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
      label: t('layout.title'),
      icon: '▦',
      onSelect: () => {},
      submenu: PRESETS.map((p): MenuItem => ({
        label: t(('layout.' + p.id) as MessageKey),
        icon: '▦',
        // The grid is read from a ref when the item is chosen, not while drawing.
        // eslint-disable-next-line react-hooks/refs
        onSelect: () => onLayout(box, p.id),
      })),
    },
    {
      label: t('paper.box.delete'),
      icon: 'trash',
      danger: true,
      onSelect: () => remove(box),
    },
  ]

  return {
    onAddBox: editable ? onAddBox : undefined,
    onAddBoxInOrder: editable ? onAddBoxInOrder : undefined,
    onBoxChange,
    onBoxesChange,
    onGridChange: editable ? onGridChange : () => {},
    onGridView: (rows, places) => {
      gridView.current = { rows, places }
    },
    onBoxMenu: (box, at) => setMenuFor({ box, at }),
    onDeleteBox: remove,
    renderBar: (box) => (
      <BoxBar
        pageId={pageId}
        boxId={box.id}
        canEdit={editable}
        onDuplicate={() => editable && duplicate(box)}
        onDelete={() => remove(box)}
        onMenu={(at) => setMenuFor({ box, at })}
      />
    ),
    onInkOnPaper: editable
      ? (at, lines) =>
          addBoxWithLines(db, pageId, at, lines).catch((error: unknown) => {
            console.error('Could not make a box for the ink', error)
            return null
          })
      : undefined,
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
