import { useEffect, useRef, useState, type RefObject } from 'react'
import { Tip } from '../../../help/Help'
import { t, type MessageKey } from '../../../i18n/t'
import type { Editor } from '../../../editor/barActions'
import { addExtraLine, addLineAfterCursor } from '../../../editor/lineActions'
import { applyPageMode } from '../../../editor/editPolicy'
import { setKeyboard } from '../../../editor/keyboardPolicy'
import { AnchoredMenu } from '../AnchoredMenu'
import { Icon, type IconName } from '../icons'
import { ToolButton } from '../ToolButton'
import { useAnchoredMenu } from '../useAnchoredMenu'
import { findTool } from '../toolRegistry'
import { useHoldSlide } from './holdSlide'
import {
  activeTool,
  extraTools,
  isModeTool,
  mainList,
  newLineExtras,
  newLineHoldMs,
  openPillTool,
  pillPinned,
  shownMainTools,
  shownPill,
  type MainTool,
} from './mainTools'
import {
  NEW_LINE_EXTRA_KINDS,
  holdOpensExtras,
  tapAction,
  type NewLineExtra,
} from './newLineGesture'
import { openToolPill, selectTool } from './selectTool'

/**
 * The main bar: one solid, icon-only row. Undo and Redo in their own small
 * pill, then the tools (the selected tool is the mode), then ⋯. Everything
 * is a 44 px target and looks the same on iPad, phone and computer.
 */

const TOOL_ICON: Record<MainTool, IconName> = {
  text: 'textSize',
  pen: 'penTool',
  highlighter: 'highlighter',
  eraser: 'eraser',
  newLine: 'newLine',
  lasso: 'lasso',
  insert: 'layoutGrid',
  read: 'bookOpen',
}

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

const BUTTON =
  'relative grid shrink-0 place-items-center rounded-xl px-2 text-ink-soft hover:bg-hover hover:text-ink motion-safe:transition-colors select-none [-webkit-touch-callout:none]'

export function MainBarRow({
  editor,
  px,
  tips,
  history,
  menuOpen,
  menuRef,
  onMenu,
}: {
  editor: Editor
  px: number
  tips: boolean
  history: { canUndo: boolean; canRedo: boolean }
  menuOpen: boolean
  menuRef: RefObject<HTMLButtonElement | null>
  onMenu: () => void
}) {
  const list = shownMainTools(mainList.useValue())
  const extras = extraTools.useValue()
  const active = activeTool.useValue()
  const opened = openPillTool.useValue()
  const pinned = pillPinned.useValue()
  const showing = shownPill(opened, pinned, active)
  const min = Math.max(px, 44)
  const hold = useHoldSlide((tool) => openToolPill(tool as never))

  const toolButton = (tool: MainTool) => {
    if (tool === 'newLine') {
      return <NewLineButton key={tool} editor={editor} min={min} />
    }
    const on = isModeTool(tool) && active === tool
    const label = t(`main.tool.${tool}` as MessageKey)
    const button = (
      <button
        key={tool}
        type="button"
        data-bar-btn
        data-bar-tool={tool}
        data-action={tool}
        data-popup-trigger
        aria-label={label}
        title={label}
        aria-pressed={isModeTool(tool) ? on : undefined}
        aria-expanded={showing === tool}
        aria-haspopup="true"
        onMouseDown={keepFocus}
        onPointerDown={(e) => hold.onPointerDown(e, tool)}
        onPointerMove={hold.onPointerMove}
        onPointerUp={hold.onPointerUp}
        onPointerCancel={hold.onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (hold.consumeHeld()) return
          selectTool(tool)
        }}
        style={{ minHeight: min, minWidth: min, touchAction: 'pan-x' }}
        className={`${BUTTON} ${on ? 'bg-hover !text-accent' : ''}`}
      >
        <Icon name={TOOL_ICON[tool]} />
        {(on || showing === tool) && (
          // Not colour alone: a bar under the icon says "selected".
          <span
            aria-hidden
            className="absolute bottom-1 h-0.5 w-4 rounded-full bg-current"
          />
        )}
      </button>
    )
    return tool === 'pen' ? (
      <Tip
        key={tool}
        id="bar.tools"
        touchInfo={false}
        className="inline-flex shrink-0"
      >
        {button}
      </Tip>
    ) : (
      button
    )
  }

  const undo = findTool('undo')
  const redo = findTool('redo')
  return (
    <div className="flex items-center gap-1.5 phone:flex-wrap" data-main-bar>
      <div
        role="group"
        aria-label={t('main.history')}
        data-slot="history"
        className="flex shrink-0 rounded-xl bg-hover"
      >
        {undo && (
          <ToolButton
            tool={undo}
            px={min}
            variant="bar"
            disabled={!history.canUndo || undefined}
            tip={tips}
          />
        )}
        {redo && (
          <ToolButton
            tool={redo}
            px={min}
            variant="bar"
            disabled={!history.canRedo || undefined}
            tip={tips}
          />
        )}
      </div>
      <div
        data-slot="tools"
        className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto phone:order-last phone:basis-full"
        style={{ scrollbarWidth: 'none' }}
      >
        {list.map(toolButton)}
        {extras.map((id) => {
          const tool = findTool(id)
          return tool ? (
            <ToolButton
              key={id}
              tool={tool}
              px={min}
              variant="bar"
              tip={tips}
            />
          ) : null
        })}
      </div>
      <KeyboardButton editor={editor} min={min} />
      <Tip
        id="bar.menu"
        touchInfo={false}
        className="inline-flex phone:order-2"
      >
        <button
          ref={menuRef}
          type="button"
          data-bar-btn
          data-action="toolbarMenu"
          data-popup-trigger
          aria-label={t('bar.menu')}
          title={t('bar.menu')}
          aria-expanded={menuOpen}
          aria-haspopup="true"
          onMouseDown={keepFocus}
          onClick={onMenu}
          style={{ minHeight: min, minWidth: min }}
          className={BUTTON}
        >
          <Icon name="more" />
        </button>
      </Tip>
    </div>
  )
}

// ---- ↵ New line: a tap adds a line, a hold opens the extras ----

const EXTRA_ICON: Record<NewLineExtra, IconName> = {
  heading: 'heading2',
  checklist: 'checklist',
  divider: 'minus',
}

function NewLineButton({ editor, min }: { editor: Editor; min: number }) {
  const mode = newLineExtras.useValue()
  const holdMs = newLineHoldMs.useValue()
  const menu = useAnchoredMenu()
  const state = {
    timer: useTimer(),
    held: useFlag(),
    lastTap: useFlag(),
  }
  const label = t('bar.newLine')

  const openExtras = (el: HTMLElement) => menu.toggle({ currentTarget: el })

  return (
    <>
      <Tip id="bar.newLine" touchInfo={false} className="inline-flex shrink-0">
        <button
          type="button"
          data-bar-btn
          data-bar-tool="newLine"
          data-action="newLine"
          aria-label={label}
          title={label}
          aria-haspopup={mode === 'off' ? undefined : 'menu'}
          onMouseDown={keepFocus}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            if (e.button !== 0 || !holdOpensExtras(mode)) return
            state.held.set(0)
            const el = e.currentTarget
            state.timer.start(() => {
              state.held.set(1)
              openExtras(el)
            }, holdMs)
          }}
          onPointerUp={() => state.timer.stop()}
          onPointerCancel={() => state.timer.stop()}
          onPointerLeave={() => state.timer.stop()}
          onClick={(e) => {
            if (state.held.get() === 1) {
              state.held.set(0)
              return
            }
            const now = Date.now()
            const action = tapAction(mode, state.lastTap.get(), now)
            state.lastTap.set(now)
            if (action === 'extras') {
              openExtras(e.currentTarget)
              return
            }
            addLineAfterCursor(editor)
          }}
          style={{ minHeight: min, minWidth: min, touchAction: 'pan-x' }}
          className={`${BUTTON} !text-accent`}
        >
          <Icon name="newLine" />
        </button>
      </Tip>
      <AnchoredMenu menu={menu} label={t('main.newLine.extras')} width={200}>
        {NEW_LINE_EXTRA_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            role="menuitem"
            data-new-line-extra={kind}
            onMouseDown={keepFocus}
            onClick={() => {
              menu.close()
              addExtraLine(editor, kind)
            }}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-start text-sm hover:bg-hover"
          >
            <Icon name={EXTRA_ICON[kind]} size={18} />
            {t(`main.newLine.${kind}` as MessageKey)}
          </button>
        ))}
      </AnchoredMenu>
    </>
  )
}

// Tiny mutable boxes that survive re-draws (no re-draw when they change).
function useTimer() {
  const id = useRef(0)
  return {
    start: (fn: () => void, ms: number) => {
      window.clearTimeout(id.current)
      id.current = window.setTimeout(fn, ms)
    },
    stop: () => window.clearTimeout(id.current),
  }
}
function useFlag() {
  const v = useRef(0)
  return { get: () => v.current, set: (n: number) => void (v.current = n) }
}

/** ⌨ shows or hides the on-screen keyboard on demand (the Pencil never opens it by itself). */
function KeyboardButton({ editor, min }: { editor: Editor; min: number }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const dom = editor.domElement
    if (!dom) return
    const doc = dom.ownerDocument
    const read = () =>
      setOn(
        dom.contains(doc.activeElement) &&
          dom.getAttribute('inputmode') !== 'none',
      )
    doc.addEventListener('focusin', read)
    doc.addEventListener('focusout', read)
    read()
    return () => {
      doc.removeEventListener('focusin', read)
      doc.removeEventListener('focusout', read)
    }
  }, [editor])
  const label = t('main.keyboard')
  return (
    <button
      type="button"
      data-bar-btn
      data-action="keyboard"
      aria-label={label}
      title={label}
      aria-pressed={on}
      onMouseDown={keepFocus}
      onClick={() => {
        // Typing needs the Text tool: an ink tool leaves the page locked.
        const switching = !on && activeTool.get() !== 'text'
        if (switching) {
          activeTool.set('text')
          applyPageMode('edit', {
            editor,
            content: editor.domElement ?? null,
            title: null,
          })
        }
        if (switching) {
          // Let the page become editable first, then ask for the keyboard.
          setTimeout(() => setKeyboard(editor, true), 60)
        } else {
          setKeyboard(editor, !on)
          setOn(!on)
        }
      }}
      style={{ minHeight: min, minWidth: min }}
      className={`${BUTTON} ${on ? 'bg-hover !text-accent' : ''}`}
    >
      <Icon name="keyboard" />
    </button>
  )
}
