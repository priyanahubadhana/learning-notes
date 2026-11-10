import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../../../i18n/t'
import type { Editor } from '../../../editor/barActions'
import { BACKGROUND_HEX, TEXT_HEX, setColor } from '../../../editor/colorData'
import { runEditorCommand } from '../editorCommands'
import { Icon, type IconName } from '../icons'
import { useKeyboardInset } from '../../../settings/deviceModeSettings'
import { currentRunner } from '../toolRuntime'
import { startGripDrag } from '../gripDrag'
import { highlightChoice, textColourChoice } from './pillChoices'
import {
  activeTool,
  openCard,
  openPillTool,
  pillPinned,
  shownPill,
} from './mainTools'
import { keepFocus } from './pillKit'
import { clampInArea, microPos, pageArea, type FreePos } from './miniBarPrefs'
import { NOTE_SIZES, applyNoteStyle, noteSize } from './textStyle'
import { ALIGNS, alignOf, setAlign, setList } from './textOps'
import { useEditorRedraw } from './useEditorRedraw'

/**
 * The floating micro text bar (bug batch 12, owner 10 Nov; GoodNotes style):
 * while the caret is in a box, one small row floats next to the box: colour
 * dot, size number, Aa, B, I, align, list, highlighter and more. The main tool
 * bar stays as it is. It can be dragged anywhere; the place is remembered per
 * device. A selection has the mini bar (with the selection handles).
 */
export function MicroBar({ editor }: { editor: Editor }) {
  useEditorRedraw(editor)
  const [focused, setFocused] = useState(false)
  // Typing starts it (a tap alone does not): it is hidden again by a tap
  // elsewhere, Esc or leaving the box.
  const [typed, setTyped] = useState(false)
  const tool = activeTool.useValue()
  const saved = microPos.useValue()
  const [drag, setDrag] = useState<FreePos | null>(null)
  const dragging = useRef(false)
  // Held by the grip: the page goes read-only and loses focus during a drag.
  const [held, setHeld] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 360, height: 48 })
  useEffect(() => {
    const dom = editor.domElement
    if (!dom) return
    const doc = dom.ownerDocument
    const on = () => setFocused(dom.contains(doc.activeElement))
    const later = () => void setTimeout(on, 0)
    on()
    const key = (e: KeyboardEvent) => {
      if (!dom.contains(doc.activeElement)) return
      if (e.key === 'Escape') setTyped(false)
      else if (e.key.length === 1) setTyped(true)
    }
    const away = (e: Event) => {
      if (!(e.target instanceof Element) || !dom.contains(e.target)) {
        if (!(
          e.target instanceof Element && e.target.closest('[data-micro-bar]')
        ))
          setTyped(false)
      }
    }
    doc.addEventListener('keydown', key, true)
    doc.addEventListener('pointerdown', away, true)
    doc.addEventListener('focusin', on)
    doc.addEventListener('focusout', later)
    return () => {
      doc.removeEventListener('focusin', on)
      doc.removeEventListener('keydown', key, true)
      doc.removeEventListener('pointerdown', away, true)
      doc.removeEventListener('focusout', later)
    }
  }, [editor])
  const view = editor.prosemirrorView
  const caret = !!view && view.state.selection.empty
  // The Text strip (the Text pill) is the one text-formatting surface while
  // it shows (bug batch 2, item 8); this bar is only the fallback.
  const strip = shownPill(openPillTool.useValue(), pillPinned.useValue(), tool)
  // The iPad keyboard bar replaces it while the keyboard is up.
  const keyboardUp = useKeyboardInset() > 150
  const show =
    held ||
    (typed &&
      focused &&
      caret &&
      tool === 'text' &&
      strip !== 'text' &&
      !keyboardUp)
  // The bar appears a moment after the key, in a task of its own: drawn in the
  // key's own task it added about 50 ms to the longest task on a big page.
  const [late, setLate] = useState(false)
  useEffect(() => {
    if (!show) return void setLate(false)
    const id = window.setTimeout(() => setLate(true), 0)
    return () => window.clearTimeout(id)
  }, [show])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs after every draw on purpose; setSize bails out when unchanged
  useLayoutEffect(() => {
    const el = barRef.current
    if (!el) return
    const next = { width: el.offsetWidth, height: el.offsetHeight }
    setSize((old) =>
      old.width === next.width && old.height === next.height ? old : next,
    )
  })
  if (!show || !(late || held) || !editor.domElement) return null

  const run = (id: string) => {
    const r = currentRunner()
    runEditorCommand(id, { editor, extras: r.extras, app: r.app })
  }
  const styles = editor.getActiveStyles() as Record<string, unknown>
  // Read only when Align is tapped: on a big page the lookup costs milliseconds
  // a key (the bar draws after every keystroke).
  const block = () =>
    editor.getTextCursorPosition().block as unknown as {
      props: Record<string, unknown>
    }
  const text = textColourChoice.get()
  const mark = highlightChoice.get()

  // Above the box (below it when there is no room): a bar under the box would
  // cover the paper where the next tap makes a new box.
  const host =
    editor.domElement.closest<HTMLElement>('[data-paper-box]') ??
    editor.domElement
  const box = host.getBoundingClientRect()
  const area = pageArea()
  // 34 px clears the box's own ⠿ and ⋯ strip.
  const above = box.top - size.height - 34
  const home: FreePos = {
    left: box.left + size.width / 2,
    top: above < area.top + 8 ? box.bottom + 10 : above,
  }
  const at = clampInArea(drag ?? saved ?? home, size, area)

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
      data-micro={b.id}
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
    </button>
  )
  const moveBar = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const next = clampInArea(
      { left: e.clientX, top: e.clientY - 22 },
      size,
      area,
    )
    setDrag(next)
  }
  const endDrag = () => {
    if (dragging.current && drag) microPos.set(drag)
    dragging.current = false
    setHeld(false)
  }

  return createPortal(
    <div
      ref={barRef}
      role="toolbar"
      aria-label={t('main.micro.label')}
      data-micro-bar
      data-chrome
      style={{
        left: Math.round(at.left),
        top: Math.round(at.top),
        transform: 'translateX(-50%)',
        width: 'max-content',
        maxWidth: area.right - area.left - 16,
      }}
      className="fixed z-[var(--z-mini)] flex flex-nowrap items-center gap-0.5 overflow-x-auto rounded-2xl border border-line bg-bg p-0.5 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_10px_28px_rgba(0,0,0,0.2)]"
    >
      <button
        type="button"
        data-micro="grip"
        aria-label={t('main.mini.move')}
        onMouseDown={keepFocus}
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          dragging.current = true
          setHeld(true)
          startGripDrag(e.currentTarget, e.pointerId)
        }}
        onPointerMove={moveBar}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => {
          microPos.set(null)
          setDrag(null)
        }}
        style={{ touchAction: 'none' }}
        className="grid min-h-11 min-w-8 cursor-grab place-items-center rounded-xl text-ink-soft hover:bg-hover"
      >
        <Icon name="grip" />
      </button>
      <button
        type="button"
        data-micro="colour"
        aria-label={t('main.opt.text.textColor')}
        onMouseDown={keepFocus}
        onClick={() => {
          openPillTool.set('text')
          openCard.set({ tool: 'text', page: 'textColor' })
        }}
        className="grid min-h-11 min-w-11 place-items-center rounded-xl hover:bg-hover"
      >
        <span
          aria-hidden
          className="size-5 rounded-full border border-ink-soft"
          style={{ backgroundColor: TEXT_HEX[text] }}
        />
      </button>
      <button
        type="button"
        data-micro="size"
        aria-label={t('main.mini.size')}
        onMouseDown={keepFocus}
        onClick={() => {
          const now = NOTE_SIZES.indexOf(noteSize.get() as never)
          noteSize.set(NOTE_SIZES[(now + 1) % NOTE_SIZES.length])
          applyNoteStyle()
        }}
        className="grid min-h-11 min-w-11 place-items-center rounded-xl text-sm font-medium text-ink-soft hover:bg-hover hover:text-ink"
      >
        {Math.round(noteSize.get() / 4)}
      </button>
      {button({
        id: 'style',
        icon: 'font',
        label: t('main.opt.text.style'),
        run: () => {
          openPillTool.set('text')
          openCard.set({ tool: 'text', page: 'style' })
        },
      })}
      {button({
        id: 'bold',
        icon: 'bold',
        label: t('main.opt.text.bold'),
        on: !!styles.bold,
        run: () => run('bold'),
      })}
      {button({
        id: 'italic',
        icon: 'italic',
        label: t('main.opt.text.italic'),
        on: !!styles.italic,
        run: () => run('italic'),
      })}
      {button({
        id: 'align',
        icon: 'alignCenter',
        label: t('main.opt.text.align'),
        run: () => {
          const now = ALIGNS.indexOf(alignOf(block()))
          setAlign(editor, ALIGNS[(now + 1) % 3])
        },
      })}
      {button({
        id: 'list',
        icon: 'list',
        label: t('main.opt.text.list'),
        run: () => setList(editor, 'bullets'),
      })}
      <button
        type="button"
        data-micro="highlight"
        aria-label={t('main.opt.text.highlightColor')}
        aria-pressed={styles.backgroundColor === mark}
        onMouseDown={keepFocus}
        onClick={() =>
          setColor(
            editor,
            'backgroundColor',
            styles.backgroundColor === mark ? 'default' : mark,
          )
        }
        className="relative grid min-h-11 min-w-11 place-items-center rounded-xl text-ink-soft hover:bg-hover hover:text-ink"
      >
        <Icon name="highlighter" />
        <span
          aria-hidden
          className="absolute bottom-1.5 h-1 w-4 rounded-full border border-ink-soft"
          style={{ backgroundColor: BACKGROUND_HEX[mark] }}
        />
      </button>
      {button({
        id: 'more',
        icon: 'more',
        label: t('main.mini.more'),
        run: () => openPillTool.set('text'),
      })}
    </div>,
    document.body,
  )
}
