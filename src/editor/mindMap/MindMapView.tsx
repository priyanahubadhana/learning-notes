import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { t } from '../../i18n/t'
import { ignoreTouch } from '../../app/palmGuard'
import {
  addChild,
  addSibling,
  childrenOf,
  indent,
  isMindTheme,
  layoutMindMap,
  MIND_THEMES,
  moveSibling,
  moveUnder,
  outdent,
  parseMindMap,
  removeNode,
  renameNode,
  serializeMindMap,
  walk,
  NODE_H,
  type MindMap,
  type MindTheme,
  type Placed,
} from './model'
import { lineColour, nodeLook } from './palette'
import { mindMapToPng } from './toPicture'

/**
 * The mind map block (G0b): an editable tree, drawn with HTML boxes over SVG
 * lines. Tap a branch to select, tap again (or Enter or F2) to type. Tab adds
 * a branch, Enter one beside it, Delete removes, Alt+arrows reorder and
 * indent, and a branch can be dragged onto another to move it.
 */

/** Two Pencil taps this close together are a double-tap (ms). */
const DOUBLE_TAP_MS = 350

const THEME_NAMES: Record<MindTheme, () => string> = {
  calm: () => t('mm.theme.calm'),
  bold: () => t('mm.theme.bold'),
  paper: () => t('mm.theme.paper'),
}

interface MindMapViewProps {
  data: string
  theme: string
  editable: boolean
  onChange: (next: { data: string; theme: MindTheme }) => void
  /** Adds the picture of the map below the block. */
  onPicture: (png: Blob) => void
}

export function MindMapView({
  data,
  theme: themeProp,
  editable,
  onChange,
  onPicture,
}: MindMapViewProps) {
  const map = useMemo(() => parseMindMap(data), [data])
  const theme: MindTheme = isMindTheme(themeProp) ? themeProp : 'calm'
  const layout = useMemo(() => layoutMindMap(map), [map])
  const placed = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, n])),
    [layout],
  )
  const [selected, setSelected] = useState(map.root)
  const [editing, setEditing] = useState<string | null>(null)
  const [drag, setDrag] = useState<{
    id: string
    x: number
    y: number
    over: string | null
  } | null>(null)
  /** Set when a key already saved the text, so the blur after it does not. */
  const cancelled = useRef(false)
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLDivElement>(null)

  const sel = placed.has(selected) ? selected : map.root

  const commit = (next: MindMap, nextTheme: MindTheme = theme) => {
    onChange({ data: serializeMindMap(next), theme: nextTheme })
  }

  // Keep the latest state for the native key handler (it is added once).
  const latest = useRef({ map, sel, editing, editable, commit })
  useEffect(() => {
    latest.current = { map, sel, editing, editable, commit }
  })

  // Keys: native, so the editor underneath never sees them.
  useEffect(() => {
    const el = root.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      const {
        map: m,
        sel: s,
        editing: ed,
        editable: can,
        commit: save,
      } = latest.current
      if (ed !== null) {
        // Typing in a branch: the editor underneath must not see the keys, so
        // Enter, Tab and Escape are handled here, not by React on the input.
        e.stopPropagation()
        const input = e.target
        if (!(input instanceof HTMLInputElement) || e.shiftKey) return
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault()
          const renamed = renameNode(m, ed, input.value)
          const added =
            e.key === 'Enter' ? addSibling(renamed, ed) : addChild(renamed, ed)
          save(added.map)
          setSelected(added.id)
          setEditing(added.id)
        } else if (e.key === 'Escape') {
          // Escape keeps what was typed (nothing is lost), then leaves.
          e.preventDefault()
          if (input.value !== m.nodes.find((n) => n.id === ed)?.text) {
            save(renameNode(m, ed, input.value))
          }
          cancelled.current = true // the blur that follows has nothing to save
          setEditing(null)
        }
        return
      }
      if ((e.target as HTMLElement).closest('select,button')) {
        if (e.key !== 'Escape') e.stopPropagation()
        return
      }
      const order = walk(m).map((w) => w.node.id)
      const idx = order.indexOf(s)
      const handled = () => {
        e.preventDefault()
        e.stopPropagation()
      }
      if (e.altKey && can) {
        const move =
          e.key === 'ArrowUp'
            ? moveSibling(m, s, -1)
            : e.key === 'ArrowDown'
              ? moveSibling(m, s, 1)
              : e.key === 'ArrowRight'
                ? indent(m, s)
                : e.key === 'ArrowLeft'
                  ? outdent(m, s)
                  : null
        if (move) {
          handled()
          if (move !== m) save(move)
          return
        }
      }
      switch (e.key) {
        case 'ArrowDown':
          handled()
          setSelected(order[Math.min(order.length - 1, idx + 1)])
          break
        case 'ArrowUp':
          handled()
          setSelected(order[Math.max(0, idx - 1)])
          break
        case 'ArrowRight': {
          handled()
          const kid = childrenOf(m, s)[0]
          if (kid) setSelected(kid.id)
          break
        }
        case 'ArrowLeft': {
          handled()
          const parent = m.nodes.find((n) => n.id === s)?.parent
          if (parent) setSelected(parent)
          break
        }
        case 'Tab':
          if (!can || e.shiftKey) return
          handled()
          {
            const added = addChild(m, s)
            save(added.map)
            setSelected(added.id)
            setEditing(added.id)
          }
          break
        case 'Enter':
          if (!can) return
          handled()
          {
            const added = addSibling(m, s)
            save(added.map)
            setSelected(added.id)
            setEditing(added.id)
          }
          break
        case 'F2':
          if (!can) return
          handled()
          setEditing(s)
          break
        case 'Delete':
        case 'Backspace':
          if (!can || s === m.root) {
            handled() // never delete the block by accident from here
            return
          }
          handled()
          {
            const parent = m.nodes.find((n) => n.id === s)?.parent ?? m.root
            save(removeNode(m, s))
            setSelected(parent)
          }
          break
        default:
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [])

  // After typing in a branch, focus returns to the map so keys keep working.
  const wasEditing = useRef(false)
  useEffect(() => {
    if (editing === null && wasEditing.current) {
      root.current?.focus({ preventScroll: true })
    }
    if (editing !== null) cancelled.current = false
    wasEditing.current = editing !== null
  }, [editing])

  const finishEdit = (id: string, text: string, keep: boolean) => {
    setEditing(null)
    // Read the newest map: a key press may already have saved this text.
    const m = latest.current.map
    if (keep && text !== m.nodes.find((n) => n.id === id)?.text) {
      commit(renameNode(m, id, text))
    }
  }

  // ---- dragging a branch onto another ----
  const hit = (x: number, y: number, skip: string): string | null => {
    for (const n of layout.nodes) {
      if (n.id === skip) continue
      if (x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h) return n.id
    }
    return null
  }
  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvas.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const down = useRef<{
    id: string
    x: number
    y: number
    wasSelected: boolean
    kind: string
  } | null>(null)
  /** The last Pencil tap, so a double-tap can type. */
  const lastPenTap = useRef<{ id: string; at: number } | null>(null)
  const onDown = (e: ReactPointerEvent, n: Placed) => {
    if (editing !== null) return
    // A palm resting on the screen while the Pencil is down does nothing.
    if (ignoreTouch(e)) return
    const wasSelected = n.id === sel
    setSelected(n.id)
    root.current?.focus({ preventScroll: true })
    if (!editable) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    down.current = {
      id: n.id,
      x: e.clientX,
      y: e.clientY,
      wasSelected,
      kind: e.pointerType,
    }
  }
  const onMove = (e: ReactPointerEvent) => {
    if (ignoreTouch(e)) return
    const d = down.current
    if (!d || d.id === map.root) return // the centre cannot be moved
    if (!drag && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return
    const p = local(e)
    setDrag({ id: d.id, x: p.x, y: p.y, over: hit(p.x, p.y, d.id) })
  }
  const onUp = (e: ReactPointerEvent) => {
    const d = down.current
    down.current = null
    if (!d) return
    if (drag) {
      if (drag.over) {
        const moved = moveUnder(map, drag.id, drag.over)
        if (moved !== map) commit(moved)
      }
      setDrag(null)
    } else if (d.kind === 'touch') {
      setEditing(d.id) // a finger tap types, like the text tool
    } else if (d.kind === 'pen') {
      // The Pencil: one tap selects (no keyboard); a double-tap types.
      const last = lastPenTap.current
      const now = e.timeStamp
      if (last && last.id === d.id && now - last.at < DOUBLE_TAP_MS) {
        lastPenTap.current = null
        setEditing(d.id)
      } else lastPenTap.current = { id: d.id, at: now }
    } else if (d.wasSelected) {
      setEditing(d.id) // a mouse: a second click types
    }
  }

  const toolbar =
    'min-h-11 rounded-lg px-3 text-sm text-ink hover:bg-hover disabled:opacity-40'
  const add = (kind: 'child' | 'sibling') => {
    const added = kind === 'child' ? addChild(map, sel) : addSibling(map, sel)
    commit(added.map)
    setSelected(added.id)
    setEditing(added.id)
  }

  return (
    <div
      ref={root}
      tabIndex={0}
      role="group"
      aria-label={t('mm.title')}
      data-chrome
      data-mind-map
      className="w-full rounded-lg border border-line bg-bg outline-none focus-visible:ring-2 focus-visible:ring-accent"
      contentEditable={false}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1">
        {editable && (
          <>
            <button
              type="button"
              className={toolbar}
              onClick={() => add('child')}
            >
              {t('mm.addChild')}
            </button>
            <button
              type="button"
              className={toolbar}
              onClick={() => add('sibling')}
            >
              {t('mm.addSibling')}
            </button>
            <button
              type="button"
              className={toolbar}
              disabled={sel === map.root}
              onClick={() => {
                const parent = map.nodes.find((n) => n.id === sel)?.parent
                commit(removeNode(map, sel))
                setSelected(parent ?? map.root)
              }}
            >
              {t('mm.delete')}
            </button>
            <label className="ml-auto flex min-h-11 items-center gap-2 text-sm">
              {t('mm.theme')}
              <select
                value={theme}
                onChange={(e) =>
                  isMindTheme(e.target.value) && commit(map, e.target.value)
                }
                className="min-h-11 rounded-lg border border-line bg-bg px-2"
              >
                {MIND_THEMES.map((id) => (
                  <option key={id} value={id}>
                    {THEME_NAMES[id]()}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={toolbar}
              onClick={() =>
                void mindMapToPng(map, theme, root.current!).then(onPicture)
              }
            >
              {t('mm.asPicture')}
            </button>
          </>
        )}
      </div>
      <div className="max-h-[70vh] overflow-auto p-2">
        <div
          ref={canvas}
          role="tree"
          aria-label={t('mm.title')}
          className="relative"
          style={{ width: layout.width, height: layout.height }}
        >
          <svg
            width={layout.width}
            height={layout.height}
            className="pointer-events-none absolute inset-0"
            aria-hidden
          >
            {map.nodes
              .filter((n) => n.parent !== null)
              .map((n) => {
                const a = placed.get(n.parent!)
                const b = placed.get(n.id)
                if (!a || !b) return null
                const x1 = a.x + a.w
                const y1 = a.y + a.h / 2
                const x2 = b.x
                const y2 = b.y + b.h / 2
                const mid = (x1 + x2) / 2
                return (
                  <path
                    key={n.id}
                    d={`M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`}
                    fill="none"
                    stroke={lineColour(theme, b.branch)}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                )
              })}
          </svg>
          {layout.nodes.map((n) => {
            const node = map.nodes.find((m) => m.id === n.id)!
            const look = nodeLook(theme, n.branch)
            const isSel = n.id === sel
            const dragging = drag?.id === n.id
            return (
              <div
                key={n.id}
                role="treeitem"
                aria-selected={isSel}
                aria-level={n.depth + 1}
                aria-label={node.text || t('mm.empty')}
                data-node={n.id}
                onPointerDown={(e) => onDown(e, n)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={() => {
                  down.current = null
                  setDrag(null)
                }}
                className="absolute flex items-center rounded-full px-3 text-sm select-none"
                style={{
                  left: n.x,
                  top: n.y,
                  width: n.w,
                  height: NODE_H,
                  background: look.background,
                  color: look.colour,
                  border: `${look.borderWidth}px ${look.dashed ? 'dashed' : 'solid'} ${look.border}`,
                  outline: isSel
                    ? '2px solid var(--color-accent)'
                    : drag?.over === n.id
                      ? '3px solid var(--color-accent)'
                      : 'none',
                  outlineOffset: 2,
                  opacity: dragging ? 0.4 : 1,
                  touchAction: editable ? 'none' : 'auto',
                  cursor: editable && n.depth > 0 ? 'grab' : 'default',
                }}
              >
                {NODE_H < 44 && (
                  // Wider than it looks: a 44 px touch area (polish 1, item 9).
                  <span
                    aria-hidden
                    data-node-hit
                    className="absolute inset-x-0"
                    style={{
                      top: -(44 - NODE_H) / 2,
                      height: 44,
                    }}
                  />
                )}
                {editing === n.id ? (
                  <input
                    autoFocus
                    defaultValue={node.text}
                    aria-label={t('mm.editBranch')}
                    maxLength={200}
                    placeholder={n.depth === 0 ? t('mm.topic') : t('mm.branch')}
                    className="w-full bg-transparent outline-none"
                    style={{ color: 'inherit' }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      if (cancelled.current) {
                        cancelled.current = false
                        return
                      }
                      finishEdit(n.id, e.target.value, true)
                    }}
                  />
                ) : (
                  <span className="truncate">
                    {node.text || (
                      <span className="opacity-60">
                        {n.depth === 0 ? t('mm.topic') : t('mm.branch')}
                      </span>
                    )}
                  </span>
                )}
              </div>
            )
          })}
          {drag && (
            <div
              aria-hidden
              className="pointer-events-none absolute z-10 rounded-full bg-accent px-3 py-1 text-sm text-white shadow"
              style={{ left: drag.x + 8, top: drag.y + 8 }}
            >
              {map.nodes.find((m) => m.id === drag.id)?.text || t('mm.branch')}
            </div>
          )}
        </div>
      </div>
      {editable && (
        <p className="border-t border-line px-3 py-1.5 text-xs text-muted">
          {t('mm.hint')}
        </p>
      )}
    </div>
  )
}
