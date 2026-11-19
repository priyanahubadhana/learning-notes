import { AllSelection } from 'prosemirror-state'
import { boxEditors } from './activeBox'
import { undoSince } from '../core/historySteps'
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { activeTool } from '../app/tools/main/mainTools'
import { MenuPopover, type MenuItem } from '../app/ui'
import { barRects, boxWithBar, frameOfBox } from './v2/listPlace'
import type { LearningNotesDB } from '../core/db'
import type { GridRow, PaperBox } from '../core/types'
import { triggerFirstUse } from '../help/firstUse'
import { t } from '../i18n/t'
import { BOX_COLOURS, MAIN_BOX } from './boxes'
import { wakeBox } from './wakeBox'
import { type GridInfo } from './layoutPlan'
import { NARROW_PX } from './sheets'
import { LayoutAssistLazy } from './v2/LayoutAssistLazy'
import { LayoutDialogLazy } from './LayoutDialogLazy'
import { LAYOUT_MODE_EVENT } from './layoutModeBus'
import { BoxStylePopoverLazy } from './BoxStylePopoverLazy'
import { BOX_STYLE_EVENT, openBoxStyle } from './boxStyleBus'

import {
  addBox,
  addBoxInOrder,
  addBoxWithLines,
  updateGrid,
  type BoxPatch,
  repairBoxes,
  removeIfEmptyBox,
  duplicateBox,
  setGroup,
  nextAfterMain,
  removeBox,
  restoreBox,
  updateBox,
  updateBoxes,
} from './boxService'
import type { BoxChange } from './PaperFrame'
import { BoxBar } from './BoxBar'
import {
  BoxBarV2Lazy,
  BoxCardV2Lazy,
  BoxMoreV2Lazy,
  PinnedBoxBarLazy,
  TextOptionsV2Lazy,
} from './v2/BoxBarV2Lazy'
import { barMoved, barPin } from './v2/oneBarPlaceStore'
import { listenOneBar } from './v2/oneBarBus'
import { prefetchBoxBarV2 } from './v2/boxBarV2Load'
import { applyNoteStyle } from '../app/tools/main/textStyle'
import { watchNextSize } from '../app/tools/main/nextSizeWatch'
import { isOn } from '../app/flags'
import { pickWhenShown } from './pickSignal'
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
const boxEl = (id: string) =>
  document.querySelector('[data-paper-box="' + CSS.escape(id) + '"]')
/** C23: the box and its bar, which its menu never covers. */
const clearOf = (id: string) => {
  const el = boxEl(id)
  if (!el) return undefined
  const r = el.getBoundingClientRect()
  // Best: clear of the box and its bars as one block; else of each one.
  return [boxWithBar(el), ...barRects(), r]
}
/** C23: the page frame, whose edge its menu never crosses. */
const frameOf = (id: string) => {
  const el = boxEl(id)
  return el ? frameOfBox(el) : undefined
}

export function usePaperBoxes(
  db: LearningNotesDB,
  pageId: string,
  editable: boolean,
): {
  onAddBox?: (at: {
    x: number
    y: number
    row?: number
    free?: boolean
    wmm?: number
    rows?: GridRow[]
  }) => void
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
  /** Lasso Group / Ungroup of the picked boxes (undefined = ungroup). */
  onGroup: (ids: string[], group: string | undefined) => void
  onDeleteBox: (box: PaperBox) => void
  /** The floating bar under a selected box. */
  renderBar: (box: PaperBox) => ReactNode
  onInkOnPaper?: (
    at: { x: number; y: number; w: number },
    lines: number,
  ) => Promise<string | null>
  /** The box made just now (its editor takes the caret). */
  fresh: string | null
  layoutMode: boolean
  layoutBar: ReactNode
  onBoxHeight: (id: string, h: number | undefined) => void
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

  // Text box v2: the box bar's code comes in while the page opens, so the
  // first tap that selects a box shows its bar at once.
  useEffect(() => {
    if (isOn('textbox.v2')) {
      prefetchBoxBarV2()
      // The note font (Easy to read by default) is written onto the page.
      applyNoteStyle()
      return watchNextSize()
    }
  }, [])

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
      // T23 (15 Nov): focus resting on a bar button or a field (the title, a
      // box card field) keeps the box for now, but the box is looked at again
      // until that focus is gone: an empty box never stays whatever its style.
      let tries = 0
      const check = () => {
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
          ) &&
          !document.activeElement.closest('[data-page-title]')
        ) {
          if (++tries < 40) window.setTimeout(check, 600)
          return
        }
        runTask(removeIfEmptyBox(db, pageId, id).then(() => {}))
      }
      // Owner 18 Nov (textbox.v2): an empty box goes at once when the user taps
      // away (the caret goes nowhere in particular): no wait, no flash.
      const to = e.relatedTarget as Element | null
      if (
        isOn('textbox.v2') &&
        !to?.closest?.('button, input, select, textarea, [role="menu"]')
      )
        return void vanishNow(id)
      window.setTimeout(check, 600)
    }
    /**
     * Owner 18 Nov: the box is hidden on the spot (the next frame), the store
     * removes it right after; if it turns out to hold something (ink the page
     * does not show yet) it comes back.
     */
    const vanishNow = (id: string, keepPicked = true) => {
      const live = document.querySelector<HTMLElement>(
        '[data-paper-box="' + CSS.escape(id) + '"]',
      )
      if (!live || (keepPicked && live.hasAttribute('data-picked'))) return
      const ed = live.querySelector('.bn-editor')
      if (
        (ed?.textContent ?? '').trim() !== '' ||
        live.querySelector(
          '.bn-block-content:not([data-content-type="paragraph"])',
        )
      )
        return
      live.style.display = 'none'
      runTask(
        removeIfEmptyBox(db, pageId, id).then((gone) => {
          if (!gone && live.isConnected) live.style.display = ''
        }),
      )
    }
    // Picking another tool also ends an empty box at once.
    const offTool = isOn('textbox.v2')
      ? activeTool.subscribe(() => {
          // A shape being drawn puts the Pen out for a moment (PaperFrame).
          if (document.documentElement.hasAttribute('data-shape-making')) return
          for (const b of document.querySelectorAll(BOX)) {
            const id = b.getAttribute('data-paper-box')
            if (id) vanishNow(id)
          }
        })
      : undefined
    /**
     * Bug 6 (owner 18 Nov, textbox.v2): a press on the paper (v2/index.ts) makes
     * every empty box it is not on go at once, even a box that never had the
     * caret (no focus-out came for it).
     */
    const offSweep = listenOneBar((m) => {
      if (m.kind !== 'sweep' || !isOn('textbox.v2')) return
      for (const b of document.querySelectorAll(BOX)) {
        const id = b.getAttribute('data-paper-box')
        if (id && id !== m.except) vanishNow(id)
      }
    })
    document.addEventListener('focusout', out, true)
    return () => {
      offTool?.()
      document.removeEventListener('focusout', out, true)
      offSweep()
    }
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
  // Which tab the Box card opens on (⋯ › Layout… opens it on Layout).
  const [styleStart, setStyleStart] = useState<'presets' | 'layout'>('presets')
  // ⋯ › Text options… (box bar part A): the Text tool's Format card.
  const [textFor, setTextFor] = useState<string | null>(null)
  // A moved, docked or pinned bar (box bar part B) is the page's, not a box's.
  const pin = barPin.useValue()
  const moved = barMoved.useValue()
  useEffect(() => {
    const on = (e: Event) => {
      setStyleStart('presets')
      setStyleFor((e as CustomEvent<string>).detail)
    }
    window.addEventListener(BOX_STYLE_EVENT, on)
    const off = listenOneBar((m) => {
      if (m.kind === 'text') setTextFor(m.boxId)
      else if (m.kind === 'layout') {
        setStyleStart('layout')
        setStyleFor(m.boxId)
      }
    })
    return () => {
      window.removeEventListener(BOX_STYLE_EVENT, on)
      off()
    }
  }, [])
  // Layout mode v2 (owner, 11 Nov): a full-screen pop-up with a live preview,
  // opened from the toolbar's Layout button, the Text strip and the box menu.
  // It writes nothing until Done, and then as one Undo step.
  const [layoutOpen, setLayoutOpen] = useState(false)
  // Text box v2 (switch textbox.v2, task 2B.10): Layout Assist on the page
  // itself instead of the pop-up.
  const [assist, setAssist] = useState(false)
  const openLayoutHere = () => {
    if (!editable) return toast(t('layout.assist.readOnly'))
    if (!isOn('textbox.v2')) return setLayoutOpen(true)
    if (window.innerWidth < NARROW_PX) return toast(t('layout.assist.phone'))
    setAssist(true)
  }
  // The Text strip's, the toolbar's and the box menu's Layout button.
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent<string>).detail === pageId) openLayoutHere()
    }
    window.addEventListener(LAYOUT_MODE_EVENT, on)
    return () => window.removeEventListener(LAYOUT_MODE_EVENT, on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, pageId])
  // Ctrl/Cmd + Alt + L: Layout mode.
  useEffect(() => {
    if (!editable) return
    const key = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.altKey || e.code !== 'KeyL') return
      const id = document.activeElement
        ?.closest('[data-paper-box]')
        ?.getAttribute('data-paper-box')
      if (!id) return
      e.preventDefault()
      openLayoutHere()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable])
  const onGridChange = (rows: GridRow[], places: BoxPatch[]) =>
    runTask(updateGrid(db, pageId, rows, places).then(() => {}))
  const onAddBox = (at: {
    x: number
    y: number
    row?: number
    free?: boolean
    wmm?: number
    rows?: GridRow[]
  }) => {
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
    runTask(
      updateBoxes(
        db,
        pageId,
        changes.map(({ id, patch }) => ({ id, patch })),
      ),
    )
  }

  /** A toast's Undo: the page's history if the action is its newest step. */
  const undoOr = (since: number, fallback: () => void) =>
    void undoSince(since).then((ok) => {
      if (!ok) fallback()
    })

  const duplicate = (box: PaperBox) =>
    runTask(duplicateBox(db, pageId, box.id).then(pickWhenShown))
  /** The same blocks without ids, so an editor makes them as new lines. */
  const plain = (blocks: readonly object[]): object[] =>
    blocks.map((blk) => {
      const { children, ...rest } = blk as Record<string, unknown>
      delete rest.id
      return { ...rest, children: plain((children as object[]) ?? []) }
    })
  /** A box's editor; a far box wakes first (its editor is made on demand). */
  const editorOf = async (id: string) => {
    wakeBox(id)
    for (let i = 0; i < 30; i++) {
      const ed = boxEditors.get(pageId, id)
      if (ed) return ed
      await new Promise((r) => setTimeout(r, 50))
    }
    return undefined
  }
  /**
   * Owner Q-3: "Delete box" on the page's first box deletes it. The next box
   * moves up and becomes the first box (its text and look); with no other box
   * the page shows no first box (the box's `gone` mark) until the user makes a
   * box. It is done in the first box's own editor, so the page saves it as it
   * saves typing. The toast's Undo puts all of it back in one step.
   */
  const removeMain = async (box: PaperBox) => {
    const ed = boxEditors.get(pageId, MAIN_BOX)
    if (!ed) return
    const before = ed.document
    const { style, colour, h, locked } = box
    const next = await nextAfterMain(db, pageId)
    let moved: Awaited<ReturnType<typeof removeBox>> = null
    if (next) {
      const from = await editorOf(next.id)
      if (!from) return
      const doc = plain(from.document)
      moved = await removeBox(db, pageId, next.id)
      ed.replaceBlocks(
        before,
        (doc.length ? doc : [{ type: 'paragraph' }]) as typeof before,
      )
      onBoxChange(MAIN_BOX, {
        style: next.style,
        colour: next.colour,
        h: next.h,
        locked: next.locked,
        gone: undefined,
      })
    } else {
      ed.replaceBlocks(before, [{ type: 'paragraph' }])
      onBoxChange(MAIN_BOX, {
        style: undefined,
        colour: undefined,
        h: undefined,
        locked: undefined,
        gone: true,
      })
    }
    toast(t('paper.box.deleted'), {
      label: t('paper.box.undo'),
      onSelect: () => {
        ed.replaceBlocks(ed.document, before)
        onBoxChange(MAIN_BOX, {
          style,
          colour,
          h,
          locked,
          gone: undefined,
        })
        if (moved) runTask(restoreBox(db, pageId, moved))
      },
    })
  }
  const remove = (box: PaperBox) => {
    // A locked box cannot be deleted until it is unlocked (box bar part A).
    if (box.locked) return toast(t('onebar.locked'))
    if (box.id === MAIN_BOX) return runTask(removeMain(box))
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

  /** Copies all of a box's text (Cut also removes the box). */
  const copyAll = (box: PaperBox, cut: boolean) => {
    const ed = boxEditors.get(pageId, box.id)
    if (!ed) return
    ed.focus()
    const view = ed.prosemirrorView
    if (view)
      view.dispatch(
        view.state.tr.setSelection(new AllSelection(view.state.doc)),
      )
    document.execCommand('copy')
    if (cut) void remove(box)
  }
  // Every box has the same menu (Q-3: the first box can be deleted too).
  const items = (box: PaperBox): MenuItem[] => [
    {
      label: t('boxStyle.title'),
      icon: 'palette',
      onSelect: () => openBoxStyle(box.id),
    },
    {
      label: t('pic.act.copy'),
      icon: 'copy',
      onSelect: () => copyAll(box, false),
    },
    {
      label: t('pic.act.cut'),
      icon: 'scissors',
      onSelect: () => copyAll(box, true),
    },
    {
      label: t('paper.box.duplicate'),
      icon: '⧉',
      onSelect: () =>
        runTask(duplicateBox(db, pageId, box.id).then(pickWhenShown)),
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
      hint: '⌃⌥L',
      onSelect: openLayoutHere,
    },
    {
      label: t('paper.box.delete'),
      icon: 'trash',
      danger: true,
      onSelect: () => remove(box),
    },
  ]

  return {
    layoutMode: assist,
    onBoxHeight: (id: string, h: number | undefined) => onBoxChange(id, { h }),
    layoutBar: assist ? (
      <LayoutAssistLazy
        db={db}
        pageId={pageId}
        getInfo={() => gridView.current}
        onDone={() => setAssist(false)}
      />
    ) : null,
    onAddBox: editable ? onAddBox : undefined,
    onAddBoxInOrder: editable ? onAddBoxInOrder : undefined,
    onBoxChange,
    onBoxesChange,
    onGridChange: editable ? onGridChange : () => {},
    onGridView: (rows, places, measured) => {
      gridView.current = { rows, places, ...measured }
    },
    onBoxMenu: (box, at) => setMenuFor({ box, at }),
    onGroup: (ids, group) => runTask(setGroup(db, pageId, ids, group)),
    onDeleteBox: remove,
    renderBar: (box) =>
      // Text box v2 (switch textbox.v2, task 2B.8): the Object bar and the ⋯ list.
      isOn('textbox.v2') ? (
        <BoxBarV2Lazy
          pageId={pageId}
          box={box}
          canEdit={editable}
          onDelete={() => remove(box)}
          onMenu={(at) => setMenuFor({ box, at })}
          onLine={(line) => onBoxChange(box.id, { line })}
        />
      ) : (
        <BoxBar
          pageId={pageId}
          boxId={box.id}
          canEdit={editable}
          onDuplicate={() => editable && duplicate(box)}
          onDelete={() => remove(box)}
          onMenu={(at) => setMenuFor({ box, at })}
          onLayout={openLayoutHere}
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
        {menuFor &&
          (isOn('textbox.v2') ? (
            <BoxMoreV2Lazy
              db={db}
              pageId={pageId}
              box={menuFor.box}
              at={menuFor.at}
              canEdit={editable}
              getGrid={() => gridView.current}
              onClose={() => setMenuFor(null)}
              onDuplicate={() => editable && duplicate(menuFor.box)}
              onDelete={() => remove(menuFor.box)}
              onLock={(locked) =>
                onBoxChange(menuFor.box.id, {
                  locked: locked ? true : undefined,
                })
              }
            />
          ) : (
            <MenuPopover
              anchor={menuFor.at}
              keepClear={clearOf(menuFor.box.id)}
              within={frameOf(menuFor.box.id)}
              items={items(menuFor.box)}
              onClose={() => setMenuFor(null)}
            />
          ))}
        {layoutOpen && (
          <LayoutDialogLazy
            db={db}
            pageId={pageId}
            getInfo={() => gridView.current}
            onClose={() => setLayoutOpen(false)}
          />
        )}
        {styleFor &&
          (isOn('textbox.v2') ? (
            // Text box v2 (2B.9): the Box card beside the box.
            <BoxCardV2Lazy
              db={db}
              pageId={pageId}
              boxId={styleFor}
              getGrid={() => gridView.current}
              start={styleStart}
              onClose={() => setStyleFor(null)}
            />
          ) : (
            <BoxStylePopoverLazy
              db={db}
              pageId={pageId}
              boxId={styleFor}
              onClose={() => setStyleFor(null)}
            />
          ))}
        {isOn('textbox.v2') && (pin || moved) && (
          <PinnedBoxBarLazy
            db={db}
            pageId={pageId}
            canEdit={editable}
            onDelete={remove}
            onMenu={(box, at) => setMenuFor({ box, at })}
            onLine={(box, line) => onBoxChange(box.id, { line })}
          />
        )}
        {textFor && isOn('textbox.v2') && (
          <TextOptionsV2Lazy
            pageId={pageId}
            boxId={textFor}
            onClose={() => setTextFor(null)}
          />
        )}
      </>
    ),
  }
}
