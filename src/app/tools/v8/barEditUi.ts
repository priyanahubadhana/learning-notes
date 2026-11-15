import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { t } from '../../../i18n/t'
import { type IconName } from '../icons'
import { findTool, toolLabel } from '../toolRegistry'
import { metaOf } from '../toolRegistryMeta'
import {
  barDraft,
  dragOver,
  isCore,
  isLocked,
  type DragTarget,
} from './barEdit'
import { v8Icon, type V8ToolId } from './registryV8'

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
