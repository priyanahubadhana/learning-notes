import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { t } from '../../../i18n/t'
import { Icon, type IconName } from '../icons'
import { findTool, toolLabel } from '../toolRegistry'
import {
  barDraft,
  cancelEdit,
  doneEdit,
  dragOver,
  isCore,
  isLocked,
  addTo,
  removeFrom,
  trayOf,
  type DragTarget,
} from './barEdit'
import { metaOf } from '../toolRegistryMeta'
import { v8Icon } from './registryV8'
import type { V8ToolId } from './registryV8'

/**
 * The parts of editing the tool bar on the bar itself (toolbar.v8, 2A.15):
 * the top bar (cancel, title, done), the "More tools" tray and the drag that
 * moves a tool live. The bar's own buttons live in ToolBar.tsx.
 */

const CORE_NAME = {
  text: 'v8.tool.text',
  pen: 'v8.tool.pen',
  eraser: 'v8.tool.eraser',
  shapes: 'v8.tool.shapes',
  lasso: 'v8.tool.lasso',
  insert: 'v8.tool.insert',
} as const

/** The name of any tool that can sit on the bar. */
export function barToolName(id: string): string {
  if (isCore(id)) return t(CORE_NAME[id as V8ToolId])
  const def = findTool(id)
  return def ? toolLabel(def) : id
}

/** The icon of any tool that can sit on the bar. */
export function barToolIcon(id: string): IconName {
  const meta = metaOf(id)
  return v8Icon(id, meta?.icon ?? findTool(id)?.icon)
}

/** The top bar: cancel keeps the bar, done saves it. */
export function EditBanner() {
  return (
    <div
      className="v8eb"
      role="group"
      aria-label={t('v8.edit.title')}
      data-testid="v8-edit-bar"
    >
      <button
        type="button"
        data-chrome
        className="v8tool"
        data-testid="v8-edit-cancel"
        aria-label={t('v8.edit.cancel')}
        title={t('v8.edit.cancel')}
        onClick={cancelEdit}
      >
        <Icon name="close" size={20} />
      </button>
      <span className="v8eb-text">
        <b>{t('v8.edit.title')}</b>
        <small>{t('v8.edit.hint')}</small>
      </span>
      <button
        type="button"
        data-chrome
        className="v8tool v8eb-ok"
        data-testid="v8-edit-done"
        aria-label={t('v8.edit.done')}
        title={t('v8.edit.done')}
        onClick={() => void doneEdit()}
      >
        <Icon name="check" size={20} />
      </button>
    </div>
  )
}

/** "More tools": what is not on the bar. A tap or a drag up adds it. */
export function EditTray({ draft }: { draft: readonly string[] }) {
  const rest = trayOf(draft)
  return (
    <div className="v8tray" data-testid="v8-edit-tray" data-edit-tray>
      <div className="v8tray-head">{t('v8.edit.tray')}</div>
      <div className="v8tray-list">
        {rest.length ? (
          rest.map((id) => (
            <button
              key={id}
              type="button"
              data-chrome
              data-edit-id={id}
              data-testid={`v8-edit-tile-${id}`}
              className="v8tile"
              aria-label={t('v8.edit.add', { name: barToolName(id) })}
              onClick={() => barDraft.set(addTo(barDraft.get() ?? [], id))}
            >
              <Icon name={barToolIcon(id)} size={22} />
              <span>{barToolName(id)}</span>
              <i className="v8badge-add" aria-hidden>
                <Icon name="plus" size={12} />
              </i>
            </button>
          ))
        ) : (
          <span className="v8tray-empty">{t('v8.edit.trayEmpty')}</span>
        )}
      </div>
    </div>
  )
}

/**
 * A tool on the bar in edit mode: the tool, and next to it (not inside it, a
 * button never holds a button) its lock or its minus. The slot is what is
 * dragged.
 */
export function EditSlot({
  id,
  locked,
  dragging,
  testKey,
  children,
}: {
  id: string
  locked: boolean
  dragging: boolean
  testKey: string
  children: ReactNode
}) {
  return (
    <span
      className="v8slot"
      data-edit-id={id}
      data-locked={locked || undefined}
      data-dragging={dragging || undefined}
    >
      {children}
      <EditBadge id={id} testKey={testKey} />
    </span>
  )
}

/** Backspace, New line and More in edit mode: always there, only a lock. */
export function FixedSlot({
  testKey,
  name,
  children,
}: {
  testKey: string
  name: string
  children: ReactNode
}) {
  return (
    <span className="v8slot" data-locked>
      {children}
      <FixedLock testKey={testKey} name={name} />
    </span>
  )
}

/** The badge on a tool in edit mode: a lock, or a minus that removes it. */
function EditBadge({ id, testKey }: { id: string; testKey: string }) {
  const name = barToolName(id)
  return isLocked(id) ? (
    <i
      className="v8badge-edit v8badge-lock"
      data-testid={`v8-edit-lock-${testKey}`}
      title={t('v8.edit.locked', { name })}
    >
      <Icon name="lock" size={11} />
    </i>
  ) : (
    <button
      type="button"
      data-chrome
      className="v8badge-edit v8badge-rm"
      data-testid={`v8-edit-remove-${testKey}`}
      aria-label={t('v8.edit.remove', { name })}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        barDraft.set(removeFrom(barDraft.get() ?? [], id))
      }}
    >
      <Icon name="minus" size={12} />
    </button>
  )
}

/** A fixed tool (Backspace, New line, More): only the lock. */
function FixedLock({ testKey, name }: { testKey: string; name: string }) {
  return (
    <i
      className="v8badge-edit v8badge-lock"
      data-testid={`v8-edit-lock-${testKey}`}
      title={t('v8.edit.locked', { name })}
    >
      <Icon name="lock" size={11} />
    </i>
  )
}

export interface EditDrag {
  dragId: string | null
}

const MOVE_PX = 6

/**
 * Drag in edit mode: press a tool on the bar (or a tile in the tray), move,
 * and the others slide aside live; over the tray a tool leaves, over the bar a
 * tray tool joins. A locked tool does not move. Returns the handler for the
 * wrapper and the id being dragged.
 */
export function useEditDrag(): {
  onPointerDown: (e: PointerEvent<HTMLElement>) => void
  dragId: string | null
  /** True once after a drag: the click that follows it is ignored. */
  consumeClick: () => boolean
} {
  const [dragId, setDragId] = useState<string | null>(null)
  const s = useRef({
    id: '',
    x: 0,
    y: 0,
    moved: false,
    pointer: -1,
    suppress: false,
  })
  const off = useRef<(() => void) | null>(null)
  useEffect(() => () => off.current?.(), [])

  const over = (x: number, y: number): DragTarget | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    if (!el) return null
    if (el.closest('[data-edit-tray]')) return 'tray'
    const tool = el.closest<HTMLElement>('.v8bar [data-edit-id]')
    if (tool) return { tool: tool.dataset.editId! }
    if (el.closest('.v8bar')) return 'bar'
    return null
  }

  return {
    dragId,
    consumeClick: () => {
      const was = s.current.suppress
      s.current.suppress = false
      return was
    },
    onPointerDown: (e) => {
      if (e.button !== 0) return
      const el = (e.target as HTMLElement).closest<HTMLElement>(
        '[data-edit-id]',
      )
      if (!el || (e.target as HTMLElement).closest('.v8badge-rm')) return
      const id = el.dataset.editId!
      if (isLocked(id)) return
      off.current?.()
      s.current = {
        id,
        x: e.clientX,
        y: e.clientY,
        moved: false,
        pointer: e.pointerId,
        suppress: false,
      }
      const move = (ev: globalThis.PointerEvent) => {
        const c = s.current
        if (ev.pointerId !== c.pointer) return
        if (
          !c.moved &&
          Math.hypot(ev.clientX - c.x, ev.clientY - c.y) < MOVE_PX
        )
          return
        if (!c.moved) {
          c.moved = true
          setDragId(c.id)
        }
        const target = over(ev.clientX, ev.clientY)
        const list = barDraft.get()
        if (!target || !list) return
        const next = dragOver(list, c.id, target)
        if (next.join('|') !== list.join('|')) barDraft.set(next)
      }
      const end = (ev: globalThis.PointerEvent) => {
        if (ev.pointerId !== s.current.pointer) return
        s.current.suppress = s.current.moved
        s.current.pointer = -1
        setDragId(null)
        off.current?.()
        off.current = null
        // A click that follows the drop is swallowed; none comes after a cancel.
        window.setTimeout(() => (s.current.suppress = false), 0)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', end)
      window.addEventListener('pointercancel', end)
      off.current = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', end)
        window.removeEventListener('pointercancel', end)
      }
    },
  }
}
