import { useEffect, useRef, useState, type RefObject } from 'react'
import { Tip } from '../../../help/Help'
import { t, type MessageKey } from '../../../i18n/t'
import type { Editor } from '../../../editor/barActions'
import {
  addExtraLine,
  addLineAfterCursor,
  deleteBackward,
} from '../../../editor/lineActions'
import { applyPageMode } from '../../../editor/editPolicy'
import { setKeyboard } from '../../../editor/keyboardPolicy'
import { AnchoredMenu } from '../AnchoredMenu'
import { Icon, type IconName } from '../icons'
import { TOOL_ICON } from './mainToolIcons'
import { resolveBar } from './barOrder'
import { BarScroll } from '../BarScroll'
import { ToolButton } from '../ToolButton'
import { useAnchoredMenu } from '../useAnchoredMenu'
import { findTool } from '../toolRegistry'
import { useHoldSlide } from './holdSlide'
import {
  activeTool,
  extraTools,
  isModeTool,
  mainList,
  barOrder,
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
import { miniKeysOn } from './miniKeys'
import { REPEAT_AFTER_MS, backspaceStep } from './backspaceHold'

/**
 * The main bar: one solid, icon-only row. Undo and Redo in their own small
 * pill, then the tools (the selected tool is the mode), then ⋯. Everything
 * is a 44 px target and looks the same on iPad, phone and computer.
 */

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
  const order = barOrder.useValue()
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
    if (tool === 'backspace') {
      return <BackspaceButton key={tool} editor={editor} min={min} />
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
        style={{
          minHeight: min,
          minWidth: 44,
          flexBasis: min,
          touchAction: 'pan-x',
        }}
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
    <div className="flex items-start gap-1 phone:flex-wrap" data-main-bar>
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
      <BarScroll className="flex-1 phone:order-last phone:basis-full">
        {resolveBar(order, list, extras).map((token) => {
          const id = token.slice(2)
          if (token.startsWith('m:')) return toolButton(id as MainTool)
          const tool = findTool(id)
          return tool ? (
            <ToolButton
              key={token}
              tool={tool}
              px={min}
              variant="bar"
              tip={tips}
            />
          ) : null
        })}
      </BarScroll>
      <KeyboardButton editor={editor} min={min} />
      <MiniKeysButton min={min} />
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
          style={{
            minHeight: min,
            minWidth: 44,
            flexBasis: min,
            touchAction: 'pan-x',
          }}
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

// ---- ⌫: a tap deletes a character, a hold repeats (and then deletes words) ----

export function BackspaceButton({
  editor,
  min,
}: {
  editor: Editor
  min: number
}) {
  const run = useRef({ timer: 0, start: 0, active: false })
  const label = t('main.tool.backspace')
  const stop = () => {
    window.clearTimeout(run.current.timer)
    run.current.active = false
  }
  useEffect(() => stop, [])
  return (
    <button
      type="button"
      data-bar-btn
      data-bar-tool="backspace"
      data-action="backspace"
      data-pen-own
      aria-label={label}
      onMouseDown={keepFocus}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          // Not a real pointer (a test): the up event still arrives.
        }
        stop()
        // The first press deletes at once; a hold starts repeating later.
        deleteBackward(editor, 'char')
        const r = run.current
        r.start = Date.now()
        r.active = true
        const step = () => {
          if (!r.active) return
          const { unit, next } = backspaceStep(Date.now() - r.start)
          if (!deleteBackward(editor, unit)) return stop()
          r.timer = window.setTimeout(step, next)
        }
        r.timer = window.setTimeout(step, REPEAT_AFTER_MS)
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        // Keyboard users: Enter or Space deletes once (a held key repeats).
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          deleteBackward(editor, 'char')
        }
      }}
      style={{
        minHeight: min,
        minWidth: 44,
        flexBasis: min,
        touchAction: 'pan-x',
      }}
      className={BUTTON}
    >
      <Icon name="backspace" />
    </button>
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

/** Shows or hides the mini keyboard strip (mic, Enter, Backspace). */
function MiniKeysButton({ min }: { min: number }) {
  const on = miniKeysOn.useValue()
  const label = t('keys.toggle')
  return (
    <button
      type="button"
      data-bar-btn
      data-action="miniKeys"
      aria-label={label}
      aria-pressed={on}
      onMouseDown={keepFocus}
      onClick={() => miniKeysOn.set(!on)}
      style={{ minHeight: min, minWidth: min }}
      className={`${BUTTON} ${on ? 'bg-hover !text-accent' : ''}`}
    >
      <Icon name="mic" />
    </button>
  )
}
