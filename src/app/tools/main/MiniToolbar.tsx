import { TextSelection } from 'prosemirror-state'
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
import { copyAs, pastePlainFromClipboard } from '../../../editor/clipboard'
import { BACKGROUND_HEX, TEXT_HEX, setColor } from '../../../editor/colorData'
import { posNear } from '../../../editor/tapSelect'
import { deleteSelected, deselect } from '../../../editor/ownSelection'
import { runEditorCommand } from '../editorCommands'
import { Icon, type IconName } from '../icons'
import { runTool } from '../toolRegistry'
import { CHROME_SELECTOR } from '../../penTap'
import { currentRunner } from '../toolRuntime'
import { highlightChoice, textColourChoice } from './pillChoices'
import { miniToolbarOpen, openCard, openPillTool } from './mainTools'
import { keepFocus } from './pillKit'
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
    return {
      left: Math.max(
        8,
        Math.min(window.innerWidth - 8, (a.left + b.right) / 2),
      ),
      top: above < 8 ? b.bottom + 28 : above,
      below: above < 8,
      start: { x: a.left, y: a.bottom },
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

  const measure = useCallback(() => setSpot(spotOf(editor)), [editor])
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
  // making the selection (a triple-tap) comes sooner than the guard below.
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
      if (!start || Date.now() - born < 450) return
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
    await copyAs(editor, 'plain', toast)
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
      run: () =>
        setColor(
          editor,
          'textColor',
          styles.textColor === text ? 'default' : text,
        ),
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
      run: () => void copyAs(editor, 'plain', toast),
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
      title={b.label}
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

  return createPortal(
    <>
      <div
        role="toolbar"
        aria-label={t('main.mini.label')}
        data-mini-toolbar
        data-pill-root
        style={{
          left: spot.left,
          top: spot.top,
          transform: 'translateX(-50%)',
          maxWidth: 'calc(100vw - 16px)',
        }}
        className="fixed z-[46] flex flex-wrap justify-center gap-0.5 rounded-2xl border border-ink-soft bg-bg p-1 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_10px_28px_rgba(0,0,0,0.2)]"
      >
        {buttons.map(button)}
        <button
          type="button"
          data-mini="close"
          aria-label={t('main.sel.deselect')}
          title={t('main.sel.deselect')}
          onMouseDown={keepFocus}
          onClick={() => {
            deselect(editor)
            miniToolbarOpen.set(false)
            setMore(false)
          }}
          className="grid min-h-11 min-w-11 place-items-center rounded-xl text-ink-soft hover:bg-hover"
        >
          <span aria-hidden>✕</span>
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
  const move = (x: number, y: number) => {
    const view = editor.prosemirrorView
    if (!view) return
    // The fingertip is below the text it points at.
    const pos = posNear(view, x, y - 14, 20)
    if (pos === null) return
    const { from, to } = view.state.selection
    const [a, b] = which === 'start' ? [pos, to] : [from, pos]
    if (a === b) return
    view.dispatch(
      view.state.tr.setSelection(
        TextSelection.between(
          view.state.doc.resolve(a),
          view.state.doc.resolve(b),
        ),
      ),
    )
  }
  const label = t(`main.mini.handle.${which}` as MessageKey)
  return (
    <button
      type="button"
      data-sel-handle={which}
      data-pen-own
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        dragging.current = true
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          // A pointer the browser does not know: carry on.
        }
      }}
      onPointerMove={(e) => dragging.current && move(e.clientX, e.clientY)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      style={{ left: at.x - 11, top: at.y + 3, touchAction: 'none' }}
      className="fixed z-[46] size-[22px] rounded-full border-2 border-accent bg-bg shadow after:absolute after:-inset-2 after:content-['']"
    />
  )
}
