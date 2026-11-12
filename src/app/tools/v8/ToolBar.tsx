import { useBlockNoteEditor } from '@blocknote/react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { historyState } from '../../../core/historySteps'
import { runHistory } from '../../../editor/historyActions'
import { addLineAfterCursor, deleteBackward } from '../../../editor/lineActions'
import type { Editor } from '../../../editor/barActions'
import { t } from '../../../i18n/t'
import { useLevel } from '../../../settings/level'
import { LAYERS } from '../../overlay'
import { Icon, type IconName } from '../icons'
import { TOOL_HOLD_MS } from '../main/mainTools'
import { REPEAT_AFTER_MS, backspaceStep } from '../main/backspaceHold'
import { FoldCard, type FoldEntry } from './FoldCard'
import type { OpenCard } from './barState'
import { v8Tools, type V8ToolId } from './registryV8'
import { useFold, type FoldSpec } from './useFold'
import './toolbarV8.css'

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

const TOOL_NAME = {
  text: 'v8.tool.text',
  pen: 'v8.tool.pen',
  eraser: 'v8.tool.eraser',
  shapes: 'v8.tool.shapes',
  lasso: 'v8.tool.lasso',
  insert: 'v8.tool.insert',
} as const

/** Who folds first on a narrow screen: higher stays longer (TB-08). */
const KEEP: Record<string, number> = {
  text: 100,
  pen: 99,
  eraser: 98,
  undo: 97,
  redo: 96,
  lasso: 95,
  insert: 94,
  min: 93,
  shapes: 92,
  bs: 91,
  nl: 90,
}

export interface ToolBarProps {
  tool: V8ToolId
  card: OpenCard | null
  onTool: (id: V8ToolId, el: HTMLElement) => void
  onToggleCard: (id: string, anchor: HTMLElement) => void
  onCloseCard: (id: string) => void
}

/** A name shown above a held tool, so a finger can read it (TB-02). */
function NameTip({ el, text }: { el: HTMLElement; text: string }) {
  const r = el.getBoundingClientRect()
  return createPortal(
    <div
      className="v8tip"
      role="tooltip"
      data-testid="v8-tip"
      style={{
        zIndex: LAYERS.menu,
        left: r.left + r.width / 2,
        top: r.bottom + 6,
      }}
    >
      {text}
    </div>,
    document.body,
  )
}

/** Hold a tool 350 ms: its name shows; slide to another tool and let go to pick it (TB-02, TB-09). */
function useToolHold(onPick: (id: V8ToolId, el: HTMLElement) => void) {
  const s = useRef({
    timer: 0,
    held: false,
    from: '' as string,
    hot: '' as string,
  })
  const [tip, setTip] = useState<{ id: V8ToolId; el: HTMLElement } | null>(null)
  const stop = () => {
    window.clearTimeout(s.current.timer)
    s.current.timer = 0
  }
  useEffect(() => stop, [])
  const toolAt = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-bar-tool]') ??
    null
  return {
    tip,
    props(id: V8ToolId) {
      return {
        onPointerDown: (e: PointerEvent<HTMLElement>) => {
          if (e.button !== 0) return
          stop()
          const el = e.currentTarget
          const pointerId = e.pointerId
          s.current.held = false
          s.current.from = id
          s.current.hot = id
          s.current.timer = window.setTimeout(() => {
            s.current.timer = 0
            s.current.held = true
            try {
              el.setPointerCapture(pointerId)
            } catch {
              // Not a real pointer (a test): the up event still arrives.
            }
            setTip({ id, el })
          }, TOOL_HOLD_MS)
        },
        onPointerMove: (e: PointerEvent<HTMLElement>) => {
          if (!s.current.held) return
          const over = toolAt(e.clientX, e.clientY)
          const over_id = over?.dataset.barTool as V8ToolId | undefined
          if (over && over_id && over_id in TOOL_NAME) {
            s.current.hot = over_id
            setTip({ id: over_id, el: over })
          }
        },
        onPointerUp: (e: PointerEvent<HTMLElement>) => {
          stop()
          if (!s.current.held) return
          setTip(null)
          const over = toolAt(e.clientX, e.clientY)
          const target = over?.dataset.barTool as V8ToolId | undefined
          if (
            over &&
            target &&
            target !== s.current.from &&
            target in TOOL_NAME
          )
            onPick(target, over)
        },
        onPointerCancel: () => {
          stop()
          s.current.held = false
          setTip(null)
        },
        /** True once after a hold: the click that follows it is ignored. */
        consumeHeld: () => {
          const was = s.current.held
          s.current.held = false
          return was
        },
      }
    },
  }
}

/** ⌫: a tap deletes one character, a hold repeats (TB-10). */
function useBackspace(editor: Editor | null) {
  const run = useRef({ timer: 0, start: 0, active: false })
  const stop = () => {
    window.clearTimeout(run.current.timer)
    run.current.active = false
  }
  useEffect(() => stop, [])
  return {
    start() {
      if (!editor) return
      stop()
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
    },
    stop,
  }
}

function ToolFace({
  icon,
  name,
  names,
  chevron,
}: {
  icon: IconName
  name: string
  names: boolean
  chevron?: boolean
}) {
  return (
    <>
      <Icon name={icon} size={20} />
      {names ? <span className="v8tool-name">{name}</span> : null}
      {chevron ? (
        <Icon name="chevronDown" size={14} className="v8chev" />
      ) : null}
    </>
  )
}

/** The first line: tools, Backspace and New line, then Undo, Redo, ⋯ and Minimise. */
export function ToolBar({
  tool,
  card,
  onTool,
  onToggleCard,
  onCloseCard,
}: ToolBarProps) {
  const level = useLevel()
  const history = historyState.useValue()
  const editor = useBlockNoteEditor() as unknown as Editor | null
  const tools = v8Tools()
  const hold = useToolHold(onTool)
  const backspace = useBackspace(editor)
  const names = level === 'professional'

  const specs: FoldSpec[] = [
    ...tools.map((x) => ({
      id: x.id as string,
      priority: KEEP[x.id] ?? 50,
      fixedW: undefined,
    })),
    { id: 'bs', priority: KEEP.bs!, fixedW: 44 },
    { id: 'nl', priority: KEEP.nl!, fixedW: 44 },
    { id: 'undo', priority: KEEP.undo!, fixedW: 44 },
    { id: 'redo', priority: KEEP.redo!, fixedW: 44 },
    { id: 'more', priority: Infinity, fixedW: 44 },
    { id: 'min', priority: KEEP.min!, fixedW: 44 },
  ]
  const { rowRef, measureRef, result } = useFold(specs, { gap: 0, moreW: 0 })
  const shows = (id: string) => result.shown.includes(id)
  const showNames = names && result.names
  const folded = result.folded.filter((id) => id !== 'more')
  const moreOpen = card?.id === 'fold.bar'

  const history_ = (kind: 'undo' | 'redo') => {
    if (editor) runHistory(editor, kind)
  }
  const newLine = () => {
    if (editor) addLineAfterCursor(editor)
  }

  const label = (id: string): string =>
    id in TOOL_NAME
      ? t(TOOL_NAME[id as V8ToolId])
      : t(
          {
            bs: 'v8.bar.backspace',
            nl: 'v8.bar.newLine',
            undo: 'v8.bar.undo',
            redo: 'v8.bar.redo',
            min: 'v8.bar.minimise',
          }[id] as 'v8.bar.undo',
        )
  const iconOf = (id: string): IconName =>
    tools.find((x) => x.id === id)?.icon ??
    ({
      bs: 'backspace',
      nl: 'newLine',
      undo: 'undo',
      redo: 'redo',
      min: 'chevronUp',
    }[id] as IconName)

  const entries: FoldEntry[] = folded.map((id) => ({
    id,
    label: label(id),
    icon: iconOf(id),
    pressed: id === tool,
    onPick: () => {
      if (id in TOOL_NAME) {
        const t_ = id as V8ToolId
        onTool(t_, card!.anchor)
        if (t_ === tool && t_ !== 'insert') onCloseCard('fold.bar')
        return
      }
      if (id === 'undo' || id === 'redo') history_(id)
      if (id === 'nl') newLine()
      if (id === 'bs' && editor) deleteBackward(editor, 'char')
      onCloseCard('fold.bar')
    },
  }))

  const btn = 'v8tool'
  return (
    <div
      className="v8bar"
      role="toolbar"
      aria-label={t('bar.v8Label')}
      data-testid="v8-bar"
      data-names={showNames || undefined}
      ref={rowRef}
    >
      {tools.map((x) => {
        if (!shows(x.id)) return null
        const on = x.id === tool
        const insert = x.id === 'insert'
        const h = hold.props(x.id)
        return (
          <button
            key={x.id}
            type="button"
            data-chrome
            data-bar-tool={x.id}
            data-testid={`v8-tool-${x.id}`}
            className={btn}
            aria-label={t(TOOL_NAME[x.id])}
            aria-pressed={insert ? undefined : on}
            aria-haspopup={insert ? 'dialog' : undefined}
            aria-expanded={insert ? card?.id === 'insert' : undefined}
            data-popup-trigger={insert ? '' : undefined}
            data-active={(!insert && on) || undefined}
            data-pressed={(insert && card?.id === 'insert') || undefined}
            onMouseDown={keepFocus}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={h.onPointerDown}
            onPointerMove={h.onPointerMove}
            onPointerUp={h.onPointerUp}
            onPointerCancel={h.onPointerCancel}
            onClick={(e) => {
              if (h.consumeHeld()) return
              onTool(x.id, e.currentTarget)
            }}
          >
            <ToolFace
              icon={x.icon}
              name={t(TOOL_NAME[x.id])}
              names={showNames}
              chevron={insert}
            />
          </button>
        )
      })}
      {shows('bs') ? (
        <button
          type="button"
          data-chrome
          data-bar-tool="backspace"
          data-testid="v8-backspace"
          className={`${btn} v8tool-first`}
          aria-label={t('v8.bar.backspace')}
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
            backspace.start()
          }}
          onPointerUp={backspace.stop}
          onPointerCancel={backspace.stop}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && editor) {
              e.preventDefault()
              deleteBackward(editor, 'char')
            }
          }}
        >
          <Icon name="backspace" size={20} />
        </button>
      ) : null}
      {shows('nl') ? (
        <button
          type="button"
          data-chrome
          data-bar-tool="newLine"
          data-testid="v8-newline"
          className={btn}
          aria-label={t('v8.bar.newLine')}
          onMouseDown={keepFocus}
          onClick={newLine}
        >
          <Icon name="newLine" size={20} />
        </button>
      ) : null}
      <span className="v8spacer" />
      {shows('undo') ? (
        <button
          type="button"
          data-chrome
          data-testid="v8-undo"
          className={btn}
          aria-label={t('v8.bar.undo')}
          disabled={!history.canUndo}
          onMouseDown={keepFocus}
          onClick={() => history_('undo')}
        >
          <Icon name="undo" size={20} />
        </button>
      ) : null}
      {shows('redo') ? (
        <button
          type="button"
          data-chrome
          data-testid="v8-redo"
          className={btn}
          aria-label={t('v8.bar.redo')}
          disabled={!history.canRedo}
          onMouseDown={keepFocus}
          onClick={() => history_('redo')}
        >
          <Icon name="redo" size={20} />
        </button>
      ) : null}
      {/* ⋯ also holds what did not fit; its own card (1f) comes later. */}
      <button
        type="button"
        data-chrome
        data-popup-trigger=""
        data-testid="v8-more"
        className={btn}
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        aria-label={
          folded.length
            ? t('v8.row.moreN', { count: folded.length })
            : t('v8.bar.more')
        }
        data-pressed={moreOpen || undefined}
        onMouseDown={keepFocus}
        onClick={(e) => onToggleCard('fold.bar', e.currentTarget)}
      >
        <Icon name="more" size={20} />
        {folded.length ? (
          <span className="v8badge">{folded.length}</span>
        ) : null}
      </button>
      {shows('min') ? (
        // Slice 1j wires Minimise; until then it only shows its place.
        <button
          type="button"
          data-chrome
          data-testid="v8-minimise"
          className={btn}
          aria-label={t('v8.bar.minimise')}
          aria-disabled="true"
          onMouseDown={keepFocus}
        >
          <Icon name="chevronUp" size={20} />
        </button>
      ) : null}
      {moreOpen && card ? (
        <FoldCard
          anchor={card.anchor}
          testId="v8-card-fold.bar"
          entries={entries}
          onClose={() => onCloseCard('fold.bar')}
        />
      ) : null}
      <div className="v8measure" ref={measureRef} aria-hidden inert>
        {tools.flatMap((x) =>
          (['full', 'short'] as const).map((mode) => (
            <span
              key={`${x.id}-${mode}`}
              className={btn}
              data-m-id={x.id}
              data-m-mode={mode}
            >
              <ToolFace
                icon={x.icon}
                name={t(TOOL_NAME[x.id])}
                names={names && mode === 'full'}
                chevron={x.id === 'insert'}
              />
            </span>
          )),
        )}
      </div>
      {hold.tip && !showNames ? (
        <NameTip el={hold.tip.el} text={t(TOOL_NAME[hold.tip.id])} />
      ) : null}
    </div>
  )
}
