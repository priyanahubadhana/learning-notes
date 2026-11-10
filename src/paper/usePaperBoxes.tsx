import { undoSince } from '../core/historySteps'
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { activeTool } from '../app/tools/main/mainTools'
import { MenuPopover, type MenuItem } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import type { GridRow, PaperBox } from '../core/types'
import { triggerFirstUse } from '../help/firstUse'
import { t } from '../i18n/t'
import { BOX_COLOURS } from './boxes'
import type { GridInfo } from './layoutPlan'
import type { AssistResult } from './LayoutAssist'
import { LayoutAssistLazy } from './LayoutAssistLazy'
import { BoxStylePopoverLazy } from './BoxStylePopoverLazy'
import { BOX_STYLE_EVENT, LAYOUT_EVENT, openBoxStyle } from './boxStyleBus'

import { NARROW_PX } from './sheets'
import {
  addBox,
  addBoxInOrder,
  addBoxWithLines,
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
  onGridView: (
    rows: GridRow[],
    places: BoxPatch[],
    measured: { heights: Record<string, number>; geo: GridInfo['geo'] },
  ) => void
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
        // What is on the screen counts too: text typed a moment ago may not be
        // saved yet, and that box must not go as "empty".
        const ed = live.querySelector('.bn-editor')
        if (
          (ed?.textContent ?? '').trim() !== '' ||
          live.querySelector(
            '.bn-block-content:not([data-content-type="paragraph"])',
          )
        )
          return
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

  const gridView = useRef<GridInfo>({
    rows: [],
    places: [],
    heights: {},
    geo: {
      sheetW: 210,
      sheetH: 297,
      gapMm: 8,
      left: 15,
      right: 15,
      top: 8,
      bottom: 15,
    },
  })
  // The Box style panel (bug batch 2, item 8): a lazy panel, opened by an event
  // from the Box bar, the Text strip or the box menu.
  const [styleFor, setStyleFor] = useState<string | null>(null)
  useEffect(() => {
    const on = (e: Event) => setStyleFor((e as CustomEvent<string>).detail)
    window.addEventListener(BOX_STYLE_EVENT, on)
    return () => window.removeEventListener(BOX_STYLE_EVENT, on)
  }, [])
  // Layout Assist (bug batch 2, items 7 and 10): a lazy dialog.
  const [assist, setAssist] = useState<{
    anchor: string
    info: GridInfo
    texts: Record<string, string>
    sheetOf: Record<string, number>
  } | null>(null)
  const openAssist = (boxId: string) => {
    if (!editable) return toast(t('layout.assist.readOnly'))
    if (window.innerWidth < NARROW_PX) return toast(t('layout.assist.phone'))
    const info = gridView.current
    const texts: Record<string, string> = {}
    const sheetOf: Record<string, number> = {}
    const period = info.geo.sheetH + info.geo.gapMm
    for (const row of info.rows)
      for (const col of row.cols)
        for (const id of col.boxIds) {
          texts[id] =
            document.querySelector(
              '[data-paper-box="' + CSS.escape(id) + '"] .bn-editor',
            )?.textContent ?? ''
          const at = info.places.find((p) => p.id === id)?.patch.y ?? 0
          sheetOf[id] = Math.max(0, Math.floor((at + 1e-6) / period))
        }
    setAssist({ anchor: boxId, info: { ...info }, texts, sheetOf })
  }
  // The Text strip's Layout button.
  useEffect(() => {
    const on = (e: Event) => openAssist((e as CustomEvent<string>).detail)
    window.addEventListener(LAYOUT_EVENT, on)
    return () => window.removeEventListener(LAYOUT_EVENT, on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable])
  // Ctrl/Cmd + Alt + L: Layout for the box that has the caret.
  useEffect(() => {
    if (!editable) return
    const key = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.altKey || e.code !== 'KeyL') return
      const id = document.activeElement
        ?.closest('[data-paper-box]')
        ?.getAttribute('data-paper-box')
      if (!id || id === 'main') return
      e.preventDefault()
      openAssist(id)
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable])
  const undoGrid = (before: GridBefore | null) => {
    if (!before) return
    toast(t('layout.done'), {
      label: t('paper.box.undo'),
      onSelect: () => runTask(restoreGrid(db, pageId, before)),
    })
  }
  const onGridChange = (rows: GridRow[], places: BoxPatch[]) =>
    runTask(updateGrid(db, pageId, rows, places).then(undoGrid))
  const applyAssist = (r: AssistResult) => {
    setAssist(null)
    runTask(
      import('./layoutAssistService').then(({ applyLayout }) =>
        applyLayout(db, pageId, r.rows, r.places, r.fresh).then(undoGrid),
      ),
    )
  }
  const applyNotebookAssist = (presetId: string) => {
    setAssist(null)
    runTask(
      import('./layoutAssistService').then(
        async ({ applyNotebook, restoreNotebook }) => {
          const nb = (await db.pages.get(pageId))?.notebookId
          if (!nb) return
          const done = await applyNotebook(db, nb, presetId)
          if (done.length === 0) return
          toast(t('layout.assist.notebookDone', { n: done.length }), {
            label: t('paper.box.undo'),
            onSelect: () => runTask(restoreNotebook(db, done)),
          })
        },
      ),
    )
  }
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
      label: t('boxStyle.title'),
      icon: 'palette',
      onSelect: () => openBoxStyle(box.id),
    },
    {
      label: t('layout.title'),
      icon: '▦',
      hint: '⌃⌥L',
      // eslint-disable-next-line react-hooks/refs
      onSelect: () => openAssist(box.id),
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
    onGridView: (rows, places, measured) => {
      gridView.current = { rows, places, ...measured }
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
        onLayout={() => openAssist(box.id)}
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
    menu: (
      <>
        {menuFor && (
          <MenuPopover
            anchor={menuFor.at}
            items={items(menuFor.box)}
            onClose={() => setMenuFor(null)}
          />
        )}
        {styleFor && (
          <BoxStylePopoverLazy
            db={db}
            pageId={pageId}
            boxId={styleFor}
            onClose={() => setStyleFor(null)}
          />
        )}
        {assist && (
          <>
            <LayoutAssistLazy
              db={db}
              pageId={pageId}
              anchor={assist.anchor}
              info={assist.info}
              texts={assist.texts}
              sheetOf={assist.sheetOf}
              onApply={applyAssist}
              onApplyNotebook={applyNotebookAssist}
              onClose={() => setAssist(null)}
              onFail={() => {
                setAssist(null)
                toast(t('layout.assist.fail'))
              }}
            />
          </>
        )}
      </>
    ),
  }
}
