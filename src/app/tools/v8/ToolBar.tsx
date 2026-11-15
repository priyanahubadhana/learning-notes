import { useBlockNoteEditor } from '@blocknote/react'
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { historyState } from '../../../core/historySteps'
import { runHistory } from '../../../editor/historyActions'
import {
  addExtraLine,
  addLineAfterCursor,
  deleteBackward,
} from '../../../editor/lineActions'
import type { Editor } from '../../../editor/barActions'
import { useFlag } from '../../flags'
import { t, type MessageKey } from '../../../i18n/t'
import {
  deviceModeSetting,
  hoverTipsSetting,
} from '../../../settings/builtinSettings'
import { useDeviceSetting } from '../../../settings/useSetting'
import { useToolNames } from './barPrefs'
import { Icon, type IconName } from '../icons'
import { TOOL_HOLD_MS, newLineExtras, newLineHoldMs } from '../main/mainTools'
import {
  NEW_LINE_EXTRA_KINDS,
  holdOpensExtras,
  tapAction,
} from '../main/newLineGesture'
import { REPEAT_AFTER_MS, backspaceStep } from '../main/backspaceHold'
import { lazyNow } from '../../lazyNow'
import { FoldCard, type FoldEntry } from './FoldCard'

// The ⋯ card's own group (1f) loads with the first ⋯ tap.
const MoreExtras = lazyNow(() => import('./cards/more/MoreExtras'))
const MoreMenuV2 = lazyNow(() => import('./cards/more/MoreMenuV2'))

import type { OpenCard } from './barState'
import { type V8ToolId } from './registryV8'
import { barDraft, barTools, isCore, isLocked, startEdit } from './barEdit'
import { EditSlot, FixedSlot } from './BarEditParts'
import { barToolIcon, barToolName, type EditDrag } from './barEditUi'
import { runTool } from '../toolRegistry'
import { useFold, type FoldSpec } from './useFold'
import './toolbarV8.css'

/** The card behind holding New line: heading, checklist, divider (TB-11). */
export const NEWLINE_CARD = 'newline.extras'

const EXTRA_ICON: Record<(typeof NEW_LINE_EXTRA_KINDS)[number], IconName> = {
  heading: 'heading2',
  checklist: 'checklist',
  divider: 'minus',
}

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

/**
 * How long a press stays still before edit mode opens (S5-22): on the bar's
 * free space soon; on a tool later, after its name has shown (TB-02) and a
 * slide to another tool (TB-09) did not start.
 */
export const EDIT_HOLD_MS = 600
export const EDIT_HOLD_TOOL_MS = 900

export interface ToolBarProps {
  editDrag: EditDrag
  tool: V8ToolId
  card: OpenCard | null
  onTool: (id: V8ToolId, el: HTMLElement) => void
  onToggleCard: (id: string, anchor: HTMLElement) => void
  onCloseCard: (id: string) => void
}

/** A name shown above a held tool, so a finger can read it (TB-02). */
function NameTip({
  el,
  text,
  testId = 'v8-tip',
}: {
  el: HTMLElement
  text: string
  testId?: string
}) {
  const r = el.getBoundingClientRect()
  return createPortal(
    <div
      className="v8tip z-(--z-menu)"
      role="tooltip"
      data-testid={testId}
      style={{
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
    /** Forget a hold in progress (edit mode took over the press). */
    reset() {
      stop()
      s.current.held = false
      setTip(null)
    },
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

/** Hold New line to open its extras; or double-tap, or never - the same setting as today (TB-11). */
function useNewLineHold(onOpen: (el: HTMLElement) => void, add: () => void) {
  const mode = newLineExtras.useValue()
  const holdMs = newLineHoldMs.useValue()
  const s = useRef({ timer: 0, held: false, lastTap: 0 })
  const stop = () => {
    window.clearTimeout(s.current.timer)
    s.current.timer = 0
  }
  useEffect(() => stop, [])
  return {
    mode,
    props: {
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if (e.button !== 0 || !holdOpensExtras(mode)) return
        stop()
        s.current.held = false
        const el = e.currentTarget
        s.current.timer = window.setTimeout(() => {
          s.current.timer = 0
          s.current.held = true
          onOpen(el)
        }, holdMs)
      },
      onPointerUp: stop,
      onPointerCancel: stop,
      onPointerLeave: stop,
      onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
      onClick: (e: { currentTarget: HTMLElement }) => {
        if (s.current.held) {
          s.current.held = false
          return
        }
        const now = Date.now()
        const action = tapAction(mode, s.current.lastTap, now)
        s.current.lastTap = now
        if (action === 'extras') onOpen(e.currentTarget)
        else add()
      },
    },
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

/** The first line: tools, Backspace and New line, then ⋯ and Minimise (Undo and Redo only without the new frame; with it they are in the top bar). */
export function ToolBar({
  editDrag,
  tool,
  card,
  onTool,
  onToggleCard,
  onCloseCard,
}: ToolBarProps) {
  const [deviceMode] = useDeviceSetting(deviceModeSetting)
  const [hoverTips] = useDeviceSetting(hoverTipsSetting)
  const history = historyState.useValue()
  const editor = useBlockNoteEditor() as unknown as Editor | null
  const saved = barTools.useValue()
  const draft = barDraft.useValue()
  const edit = draft !== null
  const list = draft ?? saved
  const tools = list.map((id) => ({ id, icon: barToolIcon(id) }))
  const editHold = useRef({ timer: 0, x: 0, y: 0 })
  const stopEditHold = () => {
    window.clearTimeout(editHold.current.timer)
    editHold.current.timer = 0
  }
  useEffect(() => stopEditHold, [])
  const hold = useToolHold(onTool)
  // PC: the mouse over an icon shows its name when the bar shows none (TB-02).
  const [hover, setHover] = useState<{ id: string; el: HTMLElement } | null>(
    null,
  )
  const backspace = useBackspace(editor)
  const nlHold = useNewLineHold(
    (el) => onToggleCard(NEWLINE_CARD, el),
    () => {
      if (editor) addLineAfterCursor(editor)
    },
  )
  const names = useToolNames(deviceMode === 'pencil')
  // 2A.4: with the new frame, Undo and Redo sit in the page top bar, not here.
  const inTopBar = useFlag('foundation.shell')

  const specs: FoldSpec[] = [
    ...tools.map((x) => ({
      id: x.id as string,
      priority: KEEP[x.id] ?? 50,
      fixedW: undefined,
    })),
    { id: 'bs', priority: KEEP.bs!, fixedW: 44 },
    { id: 'nl', priority: KEEP.nl!, fixedW: 44 },
    ...(inTopBar
      ? []
      : [
          { id: 'undo', priority: KEEP.undo!, fixedW: 44 },
          { id: 'redo', priority: KEEP.redo!, fixedW: 44 },
        ]),
    { id: 'more', priority: Infinity, fixedW: 44 },
    { id: 'min', priority: KEEP.min!, fixedW: 44 },
  ]
  const { rowRef, measureRef, result } = useFold(specs, { gap: 0, moreW: 0 })
  const shows = (id: string) =>
    (edit && !['undo', 'redo', 'min'].includes(id)) || result.shown.includes(id)
  const showNames = names && result.names
  const folded = edit ? [] : result.folded.filter((id) => id !== 'more')
  const moreOpen = card?.id === 'fold.bar'
  const menuV2 = useFlag('toolbar.menu')

  const history_ = (kind: 'undo' | 'redo') => {
    if (editor) runHistory(editor, kind)
  }
  const newLine = () => {
    if (editor) addLineAfterCursor(editor)
  }

  const label = (id: string): string =>
    tools.some((x) => x.id === id)
      ? barToolName(id)
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
      if (!isCore(id) && tools.some((x) => x.id === id)) runTool(id)
      if (id === 'undo' || id === 'redo') history_(id)
      if (id === 'nl') newLine()
      if (id === 'bs' && editor) deleteBackward(editor, 'char')
      onCloseCard('fold.bar')
    },
  }))

  const btn = 'v8tool'
  /** A tool that is always on the bar: in edit mode it shows only its lock. */
  const fixed = (testKey: string, name: string, node: ReactNode) =>
    edit ? (
      <FixedSlot key={testKey} testKey={testKey} name={name}>
        {node}
      </FixedSlot>
    ) : (
      node
    )
  // Touch and hold a tool or the bar's free space: edit mode opens (S5-22).
  const holdDown = (e: PointerEvent<HTMLElement>) => {
    if (edit || e.button !== 0) return
    const b = (e.target as HTMLElement).closest('button')
    const kind = b?.dataset.barTool
    if (b && (!kind || kind === 'backspace' || kind === 'newLine')) return
    stopEditHold()
    editHold.current.x = e.clientX
    editHold.current.y = e.clientY
    editHold.current.timer = window.setTimeout(
      () => {
        editHold.current.timer = 0
        hold.reset()
        onCloseCard('fold.bar')
        startEdit()
      },
      b ? EDIT_HOLD_TOOL_MS : EDIT_HOLD_MS,
    )
  }
  const holdMove = (e: PointerEvent<HTMLElement>) => {
    const h = editHold.current
    if (h.timer && Math.hypot(e.clientX - h.x, e.clientY - h.y) > 10)
      stopEditHold()
  }
  return (
    <div
      className="v8bar"
      role="toolbar"
      aria-label={t('bar.v8Label')}
      data-testid="v8-bar"
      data-names={showNames || undefined}
      data-editing={edit || undefined}
      ref={rowRef}
      onPointerDown={holdDown}
      onPointerMove={holdMove}
      onPointerUp={stopEditHold}
      onPointerCancel={stopEditHold}
    >
      {tools.map((x) => {
        if (!shows(x.id)) return null
        const dragging = editDrag.dragId === x.id
        const slot = (node: ReactNode) =>
          edit ? (
            <EditSlot
              key={x.id}
              id={x.id}
              locked={isLocked(x.id)}
              dragging={dragging}
              testKey={x.id}
            >
              {node}
            </EditSlot>
          ) : (
            node
          )
        if (!isCore(x.id))
          return slot(
            <button
              key={x.id}
              type="button"
              data-chrome
              data-bar-tool={x.id}
              data-testid={`v8-tool-${x.id}`}
              className={`${btn}${edit ? ' v8tool-edit' : ''}`}
              aria-label={barToolName(x.id)}
              onPointerEnter={(e) => {
                if (e.pointerType === 'mouse' && !edit)
                  setHover({ id: x.id, el: e.currentTarget })
              }}
              onPointerLeave={() => setHover(null)}
              onMouseDown={keepFocus}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => {
                if (!edit) runTool(x.id)
              }}
            >
              <ToolFace
                icon={x.icon}
                name={barToolName(x.id)}
                names={showNames}
              />
            </button>,
          )
        const id = x.id as V8ToolId
        const on = id === tool
        const insert = id === 'insert'
        const h = hold.props(id)
        return slot(
          <button
            key={x.id}
            type="button"
            data-chrome
            data-bar-tool={x.id}
            data-testid={`v8-tool-${x.id}`}
            className={`${btn}${edit ? ' v8tool-edit' : ''}`}
            aria-label={t(TOOL_NAME[id])}
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse' && !edit)
                setHover({ id: x.id, el: e.currentTarget })
            }}
            onPointerLeave={() => setHover(null)}
            aria-pressed={insert ? undefined : on}
            aria-haspopup={insert ? 'dialog' : undefined}
            aria-expanded={insert ? card?.id === 'insert' : undefined}
            data-popup-trigger={insert ? '' : undefined}
            data-active={(!insert && on) || undefined}
            data-pressed={(insert && card?.id === 'insert') || undefined}
            onMouseDown={keepFocus}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={edit ? undefined : h.onPointerDown}
            onPointerMove={edit ? undefined : h.onPointerMove}
            onPointerUp={edit ? undefined : h.onPointerUp}
            onPointerCancel={edit ? undefined : h.onPointerCancel}
            onClick={(e) => {
              if (edit) return
              if (h.consumeHeld()) return
              onTool(id, e.currentTarget)
            }}
          >
            <ToolFace
              icon={x.icon}
              name={t(TOOL_NAME[id])}
              names={showNames}
              chevron={insert}
            />
          </button>,
        )
      })}
      {shows('bs')
        ? fixed(
            'backspace',
            t('v8.bar.backspace'),
            <button
              key="bs"
              type="button"
              data-chrome
              data-bar-tool="backspace"
              data-testid="v8-backspace"
              className={`${btn} v8tool-first`}
              aria-label={t('v8.bar.backspace')}
              onMouseDown={keepFocus}
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                if (e.button !== 0 || edit) return
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
            </button>,
          )
        : null}
      {shows('nl')
        ? fixed(
            'newline',
            t('v8.bar.newLine'),
            <button
              key="nl"
              type="button"
              data-chrome
              data-bar-tool="newLine"
              data-testid="v8-newline"
              className={btn}
              aria-label={t('v8.bar.newLine')}
              aria-haspopup={nlHold.mode === 'off' ? undefined : 'dialog'}
              onMouseDown={keepFocus}
              {...(edit ? {} : nlHold.props)}
              style={{ touchAction: edit ? 'none' : 'pan-x' }}
            >
              <Icon name="newLine" size={20} />
            </button>,
          )
        : null}
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
      {fixed(
        'more',
        t('v8.bar.more'),
        <button
          key="more"
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
          data-active={(!moreOpen && folded.includes(tool)) || undefined}
          data-pressed={moreOpen || undefined}
          onMouseDown={keepFocus}
          onClick={(e) => {
            if (!edit) onToggleCard('fold.bar', e.currentTarget)
          }}
        >
          {/* The slot lit and showing the tool that sits behind it (TB-08). */}
          <Icon
            name={folded.includes(tool) ? iconOf(tool) : 'more'}
            size={20}
          />
          {folded.length ? (
            <span className="v8badge">{folded.length}</span>
          ) : null}
        </button>,
      )}
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
          entries={menuV2 ? [] : entries}
          onClose={() => onCloseCard('fold.bar')}
        >
          <Suspense fallback={null}>
            {menuV2 ? (
              <MoreMenuV2
                entries={entries}
                onClose={() => onCloseCard('fold.bar')}
                onAllTools={() => onToggleCard('more.alltools', card.anchor)}
              />
            ) : (
              <MoreExtras
                onClose={() => onCloseCard('fold.bar')}
                onAllTools={() => onToggleCard('more.alltools', card.anchor)}
              />
            )}
          </Suspense>
        </FoldCard>
      ) : null}
      {card?.id === NEWLINE_CARD ? (
        <FoldCard
          anchor={card.anchor}
          testId={`v8-card-${NEWLINE_CARD}`}
          title={t('main.newLine.extras')}
          entries={NEW_LINE_EXTRA_KINDS.map((kind) => ({
            id: kind,
            label: t(`main.newLine.${kind}` as MessageKey),
            icon: EXTRA_ICON[kind],
            onPick: () => {
              if (editor) addExtraLine(editor, kind)
              onCloseCard(NEWLINE_CARD)
            },
          }))}
          onClose={() => onCloseCard(NEWLINE_CARD)}
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
                name={barToolName(x.id)}
                names={names && mode === 'full'}
                chevron={x.id === 'insert'}
              />
            </span>
          )),
        )}
      </div>
      {hover && hoverTips === 'on' && !hold.tip && !showNames ? (
        <NameTip
          el={hover.el}
          text={barToolName(hover.id)}
          testId="v8-hover-tip"
        />
      ) : null}
      {hold.tip && !showNames ? (
        <NameTip el={hold.tip.el} text={barToolName(hold.tip.id)} />
      ) : null}
    </div>
  )
}

/** Fetches the ⋯ list's code ahead (R13). */
ToolBar.preloadMore = () =>
  Promise.all([MoreExtras.preload(), MoreMenuV2.preload()])
