import { centreEl } from '../../centreEl'
import { pmState } from '../../../editor/pm'
import { startGripDrag } from '../gripDrag'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { t, type MessageKey } from '../../../i18n/t'
import type { Editor } from '../../../editor/barActions'
import { dropNativeSelection } from '../../../editor/lassoWords'
import { copyAs, pastePlainFromClipboard } from '../../../editor/clipboard'
import { BACKGROUND_HEX, TEXT_HEX, setColor } from '../../../editor/colorData'
import { posNear } from '../../../editor/tapSelect'
import { deleteSelected, deselect } from '../../../editor/ownSelection'
import { runEditorCommand } from '../editorCommands'
import { Icon, type IconName } from '../icons'
import { runTool } from '../toolRegistry'
import { CHROME_SELECTOR } from '../../penTap'
import { tapSelected } from '../../../editor/tapSelect'
import { currentRunner } from '../toolRuntime'
import { highlightChoice, textColourChoice } from './pillChoices'
import { miniToolbarOpen, openCard, openPillTool } from './mainTools'
import { keepFocus } from './pillKit'
import {
  clampInArea,
  pageArea,
  isNewSelection,
  miniPinned,
  miniPos,
  type FreePos,
} from './miniBarPrefs'
import { NOTE_SIZES, applyNoteStyle, noteSize } from './textStyle'
import { ALIGNS, alignOf, setAlign, setList } from './textOps'
import { useEditorRedraw } from './useEditorRedraw'

/**
 * The mini toolbar: a small bar that floats near a selection made by a
 * double or triple tap (our own design). Text colour, size, Aa style, B I,
 * alignment, list, highlight, link, cut, copy and ⋯ more. It replaces the iOS
 * copy and paste callout. Two round handles at the ends of the selection
 * adjust it.
 */

interface Spot {
  left: number
  top: number
  below: boolean
  start: { x: number; y: number }
  end: { x: number; y: number }
}

function spotOf(editor: Editor): Spot | null {
  const view = editor.prosemirrorView
  if (!view) return null
  const { from, to, empty } = view.state.selection
  if (empty) return null
  try {
    const a = view.coordsAtPos(from)
    const b = view.coordsAtPos(to)
    const above = a.top - 56
    // A target scrolled off screen: the bar waits at the nearest edge.
    const edge = (y: number) =>
      Math.max(8, Math.min(window.innerHeight - 120, y))
    return {
      left: Math.max(
        8,
        Math.min(window.innerWidth - 8, (a.left + b.right) / 2),
      ),
      top: edge(above < 8 ? b.bottom + 28 : above),
      below: above < 8,
      // iOS style: the start handle above-left of the first letter, the end
      // handle below-right of the last.
      start: { x: a.left, y: a.top },
      end: { x: b.right, y: b.bottom },
    }
  } catch {
    return null
  }
}

export function MiniToolbar({ editor }: { editor: Editor }) {
  const open = miniToolbarOpen.useValue()
  useEditorRedraw(editor)
  const [spot, setSpot] = useState<Spot | null>(null)
  const [more, setMore] = useState(false)
  const view = editor.prosemirrorView
  const hasSelection = !!view && !view.state.selection.empty

  const pinned = miniPinned.useValue()
  const savedPos = miniPos.useValue()
  const [dragPos, setDragPos] = useState<FreePos | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  // The bar's real size, read after every draw, so the clamp below never
  // works from a stale width (R7-7).
  const [measured, setMeasured] = useState({ width: 320, height: 52 })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs after every draw on purpose; setMeasured bails out when the size is unchanged
  useLayoutEffect(() => {
    const el = barRef.current
    if (!el) return
    const next = { width: el.offsetWidth, height: el.offsetHeight }
    setMeasured((old) =>
      old.width === next.width && old.height === next.height ? old : next,
    )
  })
  const dragging = useRef(false)
  const placed = useRef<{
    from: number
    to: number
    doc: unknown
    text: string
  } | null>(null)
  const anchor = useRef<{ left: number; top: number } | null>(null)
  // The handles always follow the words; the bar moves only for a new
  // selection, or when its target has scrolled off the screen (R5-7).
  const measure = useCallback(() => {
    const s = spotOf(editor)
    const v = editor.prosemirrorView
    if (!s || !v) return setSpot(null)
    const sel = v.state.selection
    const now = {
      from: sel.from,
      to: sel.to,
      doc: v.state.doc as unknown,
      text: v.state.doc.textBetween(sel.from, sel.to, ' '),
    }
    const fresh = isNewSelection(placed.current, now)
    placed.current = now
    const off = s.start.y < 0 || s.start.y > window.innerHeight
    if (fresh || off || !anchor.current) {
      anchor.current = { left: s.left, top: s.top }
      if (fresh) setDragPos(null)
    }
    setSpot({ ...s, ...anchor.current })
  }, [editor])
  useLayoutEffect(() => {
    if (open && hasSelection) measure()
  }, [open, hasSelection, measure, view?.state.selection])
  useEffect(() => {
    if (!open) return
    document.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      document.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [open, measure])
  // A tap on the page away from the selection, or Esc, dismisses it (the
  // selection otherwise stays until the person acts). A tap that is part of
  // making the selection (a triple or quadruple tap) says so (tapSelect.ts).
  useEffect(() => {
    if (!open) return
    const born = Date.now()
    let down: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY }
    }
    const onUp = (e: PointerEvent) => {
      const start = down
      down = null
      if (!start || Date.now() - born < 450 || tapSelected(e)) return
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) return
      const target = e.target instanceof Element ? e.target : null
      if (!target || target.closest(CHROME_SELECTOR)) return
      if (target.closest('[data-sel-handle]')) return
      const dom = editor.domElement
      if (!dom || !dom.contains(target)) return
      deselect(editor)
      miniToolbarOpen.set(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      deselect(editor)
      miniToolbarOpen.set(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointerup', onUp, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointerup', onUp, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, editor])
  // The toolbar goes when the selection does.
  useEffect(() => {
    if (open && !hasSelection) miniToolbarOpen.set(false)
  }, [open, hasSelection])
  // A closed bar forgets where it was, so the next one is placed fresh.
  useEffect(() => {
    if (!open) {
      placed.current = null
      anchor.current = null
      setDragPos(null)
    }
  }, [open])

  if (!open || !hasSelection || !spot || !view) return null
  const toast = (m: string) => currentRunner().app?.toast(m)
  const run = (id: string) => {
    const r = currentRunner()
    runEditorCommand(id, { editor, extras: r.extras, app: r.app })
  }
  const styles = editor.getActiveStyles() as Record<string, unknown>
  const block = editor.getTextCursorPosition().block as unknown as {
    props: Record<string, unknown>
  }
  const text = textColourChoice.get()
  const mark = highlightChoice.get()
  const cut = async () => {
    await copyAs(editor, 'all', toast)
    editor.insertInlineContent([])
  }

  const buttons: {
    id: string
    icon: IconName
    label: string
    run: () => void
    on?: boolean
  }[] = [
    {
      id: 'colour',
      icon: 'palette',
      label: t('main.opt.text.textColor'),
      on: styles.textColor === text,
      // Opens the colour panel (R5-4); the swatch under the icon shows the pick.
      run: () => {
        openPillTool.set('text')
        openCard.set({ tool: 'text', page: 'textColor' })
      },
    },
    {
      id: 'size',
      icon: 'textSize',
      label: t('main.mini.size'),
      run: () => {
        const now = NOTE_SIZES.indexOf(noteSize.get() as never)
        noteSize.set(NOTE_SIZES[(now + 1) % NOTE_SIZES.length])
        applyNoteStyle()
      },
    },
    {
      id: 'style',
      icon: 'font',
      label: t('main.opt.text.style'),
      run: () => {
        openPillTool.set('text')
        openCard.set({ tool: 'text', page: 'style' })
      },
    },
    {
      id: 'bold',
      icon: 'bold',
      label: t('main.opt.text.bold'),
      on: !!styles.bold,
      run: () => run('bold'),
    },
    {
      id: 'italic',
      icon: 'italic',
      label: t('main.opt.text.italic'),
      on: !!styles.italic,
      run: () => run('italic'),
    },
    {
      id: 'align',
      icon: 'alignCenter',
      label: t('main.opt.text.align'),
      run: () => {
        const now = ALIGNS.indexOf(alignOf(block))
        setAlign(editor, ALIGNS[(now + 1) % 3])
      },
    },
    {
      id: 'list',
      icon: 'list',
      label: t('main.opt.text.list'),
      run: () => setList(editor, 'bullets'),
    },
    {
      id: 'highlight',
      icon: 'highlighter',
      label: t('main.opt.text.highlightColor'),
      on: styles.backgroundColor === mark,
      run: () =>
        setColor(
          editor,
          'backgroundColor',
          styles.backgroundColor === mark ? 'default' : mark,
        ),
    },
    {
      id: 'link',
      icon: 'link',
      label: t('main.text.link'),
      run: () => runTool('link'),
    },
    {
      id: 'cut',
      icon: 'scissors',
      label: t('main.sel.cut'),
      run: () => void cut(),
    },
    {
      id: 'copy',
      icon: 'copy',
      label: t('main.sel.copy'),
      run: () => void copyAs(editor, 'all', toast),
    },
    {
      id: 'delete',
      icon: 'trash',
      label: t('main.sel.delete'),
      run: () => {
        deleteSelected(editor)
        miniToolbarOpen.set(false)
      },
    },
    {
      id: 'more',
      icon: 'more',
      label: t('main.mini.more'),
      on: more,
      run: () => setMore(!more),
    },
  ]
  const moreItems: {
    id: string
    icon: IconName
    label: string
    run: () => void
  }[] = [
    {
      id: 'paste',
      icon: 'paste',
      label: t('main.mini.paste'),
      run: () => void pastePlainFromClipboard(editor, toast),
    },
    {
      id: 'makeCard',
      icon: 'cards',
      label: t('main.sel.makeCard'),
      run: () => runTool('card'),
    },
    {
      id: 'summary',
      icon: 'fileText',
      label: t('main.sel.summary'),
      run: () => runTool('summary'),
    },
    {
      id: 'keyPoint',
      icon: 'star',
      label: t('main.sel.keyPoint'),
      run: () => run('mark:key'),
    },
    {
      id: 'saveToNotes',
      icon: 'notebook',
      label: t('main.sel.saveToNotes'),
      run: () => toast(t('main.coming.later')),
    },
  ]
  const button = (b: {
    id: string
    icon: IconName
    label: string
    run: () => void
    on?: boolean
  }) => (
    <button
      key={b.id}
      type="button"
      data-mini={b.id}
      aria-label={b.label}
      aria-pressed={b.on}
      onMouseDown={keepFocus}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={b.run}
      className={`relative grid min-h-11 min-w-11 place-items-center rounded-xl hover:bg-hover ${
        b.on ? 'bg-hover text-accent' : 'text-ink-soft hover:text-ink'
      }`}
    >
      <Icon name={b.icon} />
      {b.id === 'colour' && (
        <span
          aria-hidden
          className="absolute bottom-1.5 h-1 w-4 rounded-full border border-ink-soft"
          style={{ backgroundColor: TEXT_HEX[text] }}
        />
      )}
      {b.id === 'highlight' && (
        <span
          aria-hidden
          className="absolute bottom-1.5 h-1 w-4 rounded-full border border-ink-soft"
          style={{ backgroundColor: BACKGROUND_HEX[mark] }}
        />
      )}
    </button>
  )

  const area = pageArea()
  const size = measured
  const at: FreePos = clampInArea(
    (pinned && savedPos) || dragPos || { left: spot.left, top: spot.top },
    size,
    area,
  )
  // Drag by the grip: the bar goes anywhere (R5-5); pinned, the place is kept.
  const moveBar = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const next = clampInArea(
      { left: e.clientX, top: e.clientY - 22 },
      size,
      area,
    )
    setDragPos(next)
    if (pinned) miniPos.set(next)
  }
  const togglePin = () => {
    if (pinned) {
      miniPinned.set(false)
    } else {
      miniPos.set(at)
      miniPinned.set(true)
    }
  }
  return createPortal(
    <>
      <div
        ref={(el) => {
          barRef.current = el
          centreEl(el)
        }}
        role="toolbar"
        aria-label={t('main.mini.label')}
        data-mini-toolbar
        data-pill-root
        data-pinned={pinned || undefined}
        style={{
          left: Math.round(at.left),
          top: Math.round(at.top),
          width: 'max-content',
          maxWidth: area.right - area.left - 16,
        }}
        className="fixed z-[var(--z-mini)] flex flex-wrap justify-center gap-0.5 rounded-2xl border border-ink-soft bg-bg p-1 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_10px_28px_rgba(0,0,0,0.2)]"
      >
        <button
          type="button"
          data-mini="grip"
          aria-label={t('main.mini.move')}
          onMouseDown={keepFocus}
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            dragging.current = true
            startGripDrag(e.currentTarget, e.pointerId)
          }}
          onPointerMove={moveBar}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          style={{ touchAction: 'none' }}
          className="grid min-h-11 min-w-8 cursor-grab place-items-center rounded-xl text-ink-soft hover:bg-hover"
        >
          <Icon name="grip" />
        </button>
        {buttons.map(button)}
        <button
          type="button"
          data-mini="pin"
          aria-label={t('main.mini.pin')}
          aria-pressed={pinned}
          onMouseDown={keepFocus}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={togglePin}
          className={`grid min-h-11 min-w-11 place-items-center rounded-xl hover:bg-hover ${
            pinned ? 'bg-hover text-accent' : 'text-ink-soft'
          }`}
        >
          <Icon name="pin" />
        </button>
        <button
          type="button"
          data-mini="close"
          aria-label={t('main.sel.deselect')}
          onMouseDown={keepFocus}
          onClick={() => {
            deselect(editor)
            miniToolbarOpen.set(false)
            setMore(false)
          }}
          className="grid min-h-11 min-w-11 place-items-center rounded-xl text-ink-soft hover:bg-hover"
        >
          <Icon name="close" size={18} />
        </button>
        {more && (
          <div
            role="group"
            aria-label={t('main.mini.more')}
            className="flex basis-full flex-wrap justify-center gap-0.5 border-t border-line pt-0.5"
          >
            {moreItems.map(button)}
          </div>
        )}
      </div>
      <Handle editor={editor} which="start" at={spot.start} />
      <Handle editor={editor} which="end" at={spot.end} />
    </>,
    document.body,
  )
}

/** A round handle at one end of the selection; drag it to adjust. */
function Handle({
  editor,
  which,
  at,
}: {
  editor: Editor
  which: 'start' | 'end'
  at: { x: number; y: number }
}) {
  const dragging = useRef(false)
  // The loupe above the finger or Pencil while a handle is dragged (item 42).
  const [loupe, setLoupe] = useState<{
    x: number
    y: number
    before: string
    after: string
  } | null>(null)
  // Where the finger took hold, relative to the edge it holds: the new edge
  // follows the finger's movement from there, so the first move never jumps
  // to another line (the handle sits beside the text, not on it).
  const grab = useRef({ dx: 0, dy: 0 })
  const edge = () => {
    const view = editor.prosemirrorView
    if (!view) return null
    const { from, to } = view.state.selection
    const c = view.coordsAtPos(which === 'start' ? from : to)
    return {
      x: which === 'start' ? c.left : c.right,
      y: (c.top + c.bottom) / 2,
    }
  }
  const move = (x: number, y: number) => {
    const view = editor.prosemirrorView
    const e = edge()
    if (!view || !e) return
    const pos = posNear(view, x - grab.current.dx, y - grab.current.dy, 20)
    if (pos === null) return
    const { from, to } = view.state.selection
    const [a, b] = which === 'start' ? [pos, to] : [from, pos]
    if (a === b) return
    if (a === from && b === to) return
    view.dispatch(
      view.state.tr.setSelection(
        pmState().TextSelection.between(
          view.state.doc.resolve(a),
          view.state.doc.resolve(b),
        ),
      ),
    )
    dropNativeSelection(view) // no iPadOS menu during the drag
  }
  const showLoupe = (x: number, y: number) => {
    const view = editor.prosemirrorView
    if (!view) return
    const pos =
      which === 'start' ? view.state.selection.from : view.state.selection.to
    const d = view.state.doc
    const a = Math.max(0, pos - 14)
    const b = Math.min(d.content.size, pos + 14)
    setLoupe({
      x,
      y,
      before: d.textBetween(a, pos, ' '),
      after: d.textBetween(pos, b, ' '),
    })
  }
  const label = t(`main.mini.handle.${which}` as MessageKey)
  return (
    <>
      <button
        type="button"
        data-sel-handle={which}
        data-pen-own
        aria-label={label}
        onMouseDown={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          dragging.current = true
          const at0 = edge()
          grab.current = at0
            ? { dx: e.clientX - at0.x, dy: e.clientY - at0.y }
            : { dx: 0, dy: 0 }
          try {
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {
            // A pointer the browser does not know: carry on.
          }
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return
          move(e.clientX, e.clientY)
          showLoupe(e.clientX, e.clientY)
        }}
        onPointerUp={() => {
          dragging.current = false
          setLoupe(null)
        }}
        onPointerCancel={() => {
          dragging.current = false
          setLoupe(null)
        }}
        style={{
          left: at.x - 7,
          top: which === 'start' ? at.y - 12 : at.y - 2,
          // The touch rule that makes every button 44 px must not blow it up.
          minWidth: 0,
          minHeight: 0,
          touchAction: 'none',
        }}
        // The bigger touch area grows away from the words only, so a third or
        // fourth tap on a short selected word never lands on a handle.
        className={`fixed z-[var(--z-mini)] size-[14px] rounded-full border-[1.5px] border-accent bg-bg before:pointer-events-none before:absolute before:left-1/2 before:h-[22px] before:w-[1.5px] before:-translate-x-1/2 before:bg-accent before:content-[''] after:absolute after:-inset-x-3 after:content-[''] ${
          which === 'start'
            ? 'before:top-full after:-top-3 after:bottom-0'
            : 'before:bottom-full after:top-0 after:-bottom-3'
        }`}
      />
      {loupe && (
        <div
          aria-hidden
          data-sel-loupe
          className="pointer-events-none fixed z-[var(--z-mini)] max-w-[80vw] -translate-x-1/2 whitespace-pre rounded-xl border border-ink-soft bg-bg px-3 py-1.5 text-xl text-ink shadow-lg"
          style={{
            left: Math.max(60, Math.min(window.innerWidth - 60, loupe.x)),
            top: Math.max(8, loupe.y - 84),
          }}
        >
          <span>{loupe.before}</span>
          <span className="mx-px inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-accent" />
          <span>{loupe.after}</span>
        </div>
      )}
    </>
  )
}
