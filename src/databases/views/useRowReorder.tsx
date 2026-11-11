import {
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import { placeRow, type RowPlace } from '../databaseService'
import { DragGhost } from './DragGhost'
import { indexOver, moveId, placeAt, placeBack } from './reorderRows'
import { useDragGesture } from './useDragGesture'

/** What the Table and List need to draw and wire the re-ordering of rows. */
export interface RowReorder {
  /** Attributes for a row element (`tr` / `li`). */
  row: (id: string) => Record<string, string | undefined>
  /** Props for the grip button of a row. */
  grip: (id: string) => {
    type: 'button'
    'aria-label': string
    'aria-describedby': string
    'data-reorder-grip': string
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
    onKeyDown: (e: ReactKeyboardEvent) => void
    onKeyUp: (e: ReactKeyboardEvent) => void
    onClick: (e: { preventDefault: () => void }) => void
  }
  /** The drag card, the screen-reader texts; render once next to the rows. */
  overlay: ReactNode
}

interface Drag {
  id: string
  group: string
  name: string
  x: number
  y: number
  width: number
  offsetX: number
  offsetY: number
  over: { id: string; lower: boolean } | null
}

interface Grab {
  id: string
  group: string
  name: string
  /** Where the rows were when it was picked up. */
  original: readonly string[]
  /** Where they are now (the screen follows with the saved data). */
  ids: readonly string[]
}

/**
 * Re-ordering of rows by hand in the Table and List (only while the view has
 * no sort). Drag the grip with a mouse, Pencil or finger (the grip never
 * scrolls, so a finger on it drags at once); or, with the keyboard, press
 * Space on it, move with Up and Down, and drop with Space. Rows move only
 * inside their own group. Each move is one `placeRow` and one Undo.
 */
export function useRowReorder({
  db,
  enabled,
  groups,
  nameOf,
}: {
  db: LearningNotesDB
  enabled: boolean
  /** Row ids of each group, in the order shown ('' = no grouping). */
  groups: ReadonlyMap<string, readonly string[]>
  nameOf: (id: string) => string
}): RowReorder {
  const ui = useContext(AppUiContext)
  const scope = useId()
  const helpId = `${scope}-reorder-help`
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const [grab, setGrab] = useState<Grab | null>(null)
  const grabRef = useRef<Grab | null>(null)
  const [live, setLive] = useState('')

  const groupOf = useMemo(() => {
    const map = new Map<string, string>()
    for (const [group, ids] of groups) for (const id of ids) map.set(id, group)
    return map
  }, [groups])

  function setDragState(next: Drag | null) {
    dragRef.current = next
    setDrag(next)
  }

  /** Writes a move, and offers Undo (which puts the row back). */
  function commit(
    id: string,
    name: string,
    place: RowPlace,
    back: RowPlace | null,
  ) {
    runTask(
      placeRow(db, id, {}, place).then(() =>
        ui.toast(t('reorder.moved', { name }), {
          label: t('review.undo'),
          onSelect: () => back && runTask(placeRow(db, id, {}, back)),
        }),
      ),
    )
  }

  /** The row (of the dragged row's group) under the pointer. */
  function overAt(d: Drag, x: number, y: number): Drag['over'] {
    for (const el of document.elementsFromPoint(x, y)) {
      const row = el.closest<HTMLElement>('[data-reorder-row]')
      if (!row) continue
      if (
        row.dataset.reorderScope !== scope ||
        groupOf.get(row.dataset.reorderRow!) !== d.group
      ) {
        return null
      }
      if (row.dataset.reorderRow === d.id) return null
      const box = row.getBoundingClientRect()
      return {
        id: row.dataset.reorderRow!,
        lower: y > box.top + box.height / 2,
      }
    }
    return null
  }

  const gesture = useDragGesture(
    {
      start: (id, x, y, el) => {
        if (!enabled || grabRef.current) return false
        const group = groupOf.get(id)
        if (group === undefined) return false
        const row = el.closest<HTMLElement>('[data-reorder-row]') ?? el
        const box = row.getBoundingClientRect()
        const d: Drag = {
          id,
          group,
          name: nameOf(id),
          x,
          y,
          width: Math.min(Math.max(box.width, 140), 280),
          offsetX: 24,
          offsetY: 14,
          over: null,
        }
        setDragState({ ...d, over: overAt(d, x, y) })
        return true
      },
      move: (x, y) => {
        const d = dragRef.current
        if (d) setDragState({ ...d, x, y, over: overAt(d, x, y) })
      },
      end: (keep) => {
        const d = dragRef.current
        setDragState(null)
        if (!keep || !d?.over) return
        const ids = groups.get(d.group) ?? []
        const at = indexOver(ids, d.id, d.over.id, d.over.lower)
        const place = at === null ? null : placeAt(ids, d.id, at)
        if (place) commit(d.id, d.name, place, placeBack(ids, d.id))
      },
    },
    'handle',
  )

  // --------------------------------------------------------- keyboard

  function position(
    g: Grab,
    ids: readonly string[],
    key: 'position' | 'pickedUp',
  ) {
    return t(key === 'position' ? 'reorder.position' : 'reorder.pickedUp', {
      name: g.name,
      n: ids.indexOf(g.id) + 1,
      total: ids.length,
    })
  }

  function startGrab(id: string) {
    const group = groupOf.get(id)
    const ids = group === undefined ? undefined : groups.get(group)
    if (!enabled || group === undefined || !ids) return
    const g: Grab = { id, group, name: nameOf(id), original: ids, ids }
    grabRef.current = g
    setGrab(g)
    setLive(position(g, ids, 'pickedUp'))
  }

  function stepGrab(by: -1 | 1) {
    const g = grabRef.current
    if (!g) return
    const at = g.ids.indexOf(g.id) + by
    if (at < 0 || at >= g.ids.length) return
    const place = placeAt(g.ids, g.id, at)
    if (!place) return
    const ids = moveId(g.ids, g.id, at)
    grabRef.current = { ...g, ids }
    setGrab(grabRef.current)
    runTask(placeRow(db, g.id, {}, place))
    setLive(position(g, ids, 'position'))
  }

  function endGrab(keep: boolean) {
    const g = grabRef.current
    if (!g) return
    grabRef.current = null
    setGrab(null)
    const back = placeBack(g.original, g.id)
    if (g.ids.every((id, i) => id === g.original[i]) || !back) return
    if (!keep) {
      runTask(placeRow(db, g.id, {}, back))
      setLive(t('reorder.cancelled'))
      return
    }
    ui.toast(t('reorder.moved', { name: g.name }), {
      label: t('review.undo'),
      onSelect: () => runTask(placeRow(db, g.id, {}, back)),
    })
  }

  function onKeyDown(e: ReactKeyboardEvent, id: string) {
    if (!enabled || e.altKey || e.ctrlKey || e.metaKey) return
    const g = grabRef.current
    if (!g) {
      if (e.key === ' ') {
        e.preventDefault()
        startGrab(id)
      }
      return
    }
    if (g.id !== id) return
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      stepGrab(e.key === 'ArrowUp' ? -1 : 1)
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      endGrab(true)
    } else if (e.key === 'Tab') {
      endGrab(true)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      endGrab(false)
    }
  }

  // A press elsewhere drops a picked-up row; the grip (which React moves
  // with its row) keeps the keyboard focus.
  const grabbed = grab?.id
  useEffect(() => {
    if (!grabbed) return
    const drop = () => endGrab(true)
    document.addEventListener('pointerdown', drop)
    return () => document.removeEventListener('pointerdown', drop)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- endGrab reads the refs, not render values
  }, [grabbed])
  useEffect(() => {
    if (!grabbed) return
    const grip = document.querySelector<HTMLElement>(
      `[data-reorder-scope="${CSS.escape(scope)}"][data-reorder-row="${CSS.escape(grabbed)}"] [data-reorder-grip]`,
    )
    if (grip && document.activeElement !== grip) grip.focus()
  })

  // ------------------------------------------------------------- props

  const markOf = (id: string): string | undefined => {
    if (drag?.id === id || grab?.id === id) return 'dragged'
    if (drag?.over?.id !== id) return undefined
    const ids = groups.get(drag.group) ?? []
    const at = indexOver(ids, drag.id, id, drag.over.lower)
    if (at === null || !placeAt(ids, drag.id, at)) return undefined
    return drag.over.lower ? 'below' : 'above'
  }

  return {
    row: (id) => ({
      'data-reorder-row': id,
      'data-reorder-scope': scope,
      'data-reorder-mark': markOf(id),
    }),
    grip: (id) => ({
      type: 'button',
      'aria-label': t('reorder.grip'),
      'aria-describedby': helpId,
      'data-reorder-grip': id,
      onPointerDown: (e) => gesture.onPointerDown(e, id),
      onKeyDown: (e) => onKeyDown(e, id),
      onKeyUp: (e) => {
        if (e.key === ' ') e.preventDefault() // no click after picking up
      },
      onClick: (e) => e.preventDefault(),
    }),
    overlay: (
      <>
        <p id={helpId} className="sr-only">
          {t('reorder.help')}
        </p>
        <p role="status" className="sr-only">
          {live}
        </p>
        {drag && (
          <DragGhost
            x={drag.x - drag.offsetX}
            y={drag.y - drag.offsetY}
            width={drag.width}
          >
            {drag.name}
          </DragGhost>
        )}
      </>
    ),
  }
}
