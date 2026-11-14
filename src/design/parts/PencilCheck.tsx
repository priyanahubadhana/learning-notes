import { useEffect, useRef, useState } from 'react'
import { watchWindowEvents } from '../../app/input/windowRecorder'
import {
  CHECK_EVENTS,
  describeEvent,
  isNearBar,
  pushRow,
  type CheckRow,
} from './pencilCheckLogic'

/**
 * The hidden "Pencil check" panel (P1.5a). Records only: every listener is
 * passive and never stops or changes an event. Lazy-loaded and shown only on
 * the preview host with ?pencilcheck=1 (see pencilCheckShown).
 */
export default function PencilCheck() {
  const [rows, setRows] = useState<CheckRow[]>([])
  const [open, setOpen] = useState(true)
  const rowsRef = useRef<CheckRow[]>([])
  const idRef = useRef(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const seen = useRef(new WeakMap<Event, number>())

  useEffect(() => {
    const commit = (next: CheckRow[]) => {
      rowsRef.current = next
      setRows(next)
    }
    const onCapture = (e: Event) => {
      const el = e.target instanceof Element ? e.target : null
      if (!isNearBar(el)) return
      // The panel's own taps are not part of the evidence.
      if (el?.closest('[data-pencil-check]')) return
      const row = describeEvent(e, ++idRef.current, () => false)
      seen.current.set(e, row.id)
      commit(pushRow(rowsRef.current, row))
      // After the app's own handlers had their turn: prevented? did the bar start a drag?
      setTimeout(() => {
        const dragging = !!document.querySelector('.sbar__thumb--drag')
        commit(
          rowsRef.current.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  prevented: e.defaultPrevented,
                  barHandled: dragging || e.defaultPrevented,
                }
              : r,
          ),
        )
      }, 0)
    }
    const onBubble = (e: Event) => {
      const id = seen.current.get(e)
      if (id === undefined) return
      commit(
        rowsRef.current.map((r) => (r.id === id ? { ...r, bubbled: true } : r)),
      )
    }
    return watchWindowEvents(CHECK_EVENTS, onCapture, onBubble)
  }, [])

  // The top layer keeps the panel above every dialog.
  useEffect(() => {
    if (open) panelRef.current?.showPopover?.()
  }, [open])

  if (!open) return null
  return (
    <div
      ref={panelRef}
      popover="manual"
      data-pencil-check
      data-chrome
      role="region"
      aria-label="Pencil check"
      style={{
        position: 'fixed',
        inset: 'auto auto 8px 8px',
        margin: 0,
        width: 'min(96vw, 560px)',
        maxHeight: '45vh',
        overflow: 'auto',
        background: 'var(--color-surface, #fff)',
        color: 'var(--color-text, #111)',
        border: '1px solid var(--color-border, #999)',
        borderRadius: 12,
        padding: 8,
        font: '11px/1.35 ui-monospace, monospace',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <strong style={{ flex: 1 }}>Pencil check ({rows.length})</strong>
        <button
          type="button"
          onClick={() => {
            rowsRef.current = []
            setRows([])
          }}
          style={{ minHeight: 44, minWidth: 64 }}
        >
          Clear
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          style={{ minHeight: 44, minWidth: 44 }}
        >
          ✕
        </button>
      </div>
      <div>
        {rows.map((r) => (
          <div key={r.id} data-row style={{ borderTop: '1px solid #8884' }}>
            {r.type} {r.pointerType} {r.target} prevented={String(r.prevented)}{' '}
            btn={r.buttons} p={r.pressure} touch={r.touchType} ta=
            {r.touchAction} bubbled={String(r.bubbled)} bar=
            {String(r.barHandled)}
          </div>
        ))}
      </div>
    </div>
  )
}
