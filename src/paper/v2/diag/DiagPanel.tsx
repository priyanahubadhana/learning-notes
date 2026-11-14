import { useEffect, useRef, useState } from 'react'
import { startBoxPencilLog, type BoxEntry } from './boxPencilLog'
import { startSaveStateLog, type SaveEntry } from './saveStateLog'
import {
  copyText,
  DIAG_LABELS,
  diagPanelShown,
  loadRows,
  saveRows,
} from './diagStore'

const BOX_KEY = 'learning-notes:diag.boxPencil'
const SAVE_KEY = 'learning-notes:diag.saveState'

const store = (): Storage | undefined => {
  try {
    return localStorage
  } catch {
    return undefined
  }
}

const btn = {
  minHeight: 44,
  minWidth: 44,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid var(--color-line)',
  background: 'var(--color-bg)',
  color: 'var(--color-ink)',
} as const

/**
 * Hidden recorders (2B.2), loaded lazily on the preview address only. They
 * record quietly (passive listeners, no note text, the last 300 entries kept
 * on the device); the panel with Copy shows only with ?boxlog=1.
 */
export default function DiagPanel() {
  const [box, setBox] = useState<BoxEntry[]>(() =>
    loadRows<BoxEntry>(store(), BOX_KEY),
  )
  const [save, setSave] = useState<SaveEntry[]>(() =>
    loadRows<SaveEntry>(store(), SAVE_KEY),
  )
  const [open, setOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const boxRef = useRef(box)
  const saveRef = useRef(save)

  useEffect(() => {
    const stopBox = startBoxPencilLog(boxRef.current, (rows) => {
      boxRef.current = rows
      setBox(rows)
    })
    const stopSave = startSaveStateLog(saveRef.current, (rows) => {
      saveRef.current = rows
      setSave(rows)
    })
    // Kept on the device a moment after each change (not on every move).
    const timer = setInterval(() => {
      saveRows(store(), BOX_KEY, boxRef.current)
      saveRows(store(), SAVE_KEY, saveRef.current)
    }, 1000)
    return () => {
      stopBox()
      stopSave()
      clearInterval(timer)
    }
  }, [])

  const shown = diagPanelShown(location.search) && open
  useEffect(() => {
    if (shown) ref.current?.showPopover?.()
  }, [shown])

  if (!shown) return null
  return (
    <div
      ref={ref}
      popover="manual"
      data-diag-panel
      role="region"
      aria-label={DIAG_LABELS.title}
      style={{
        position: 'fixed',
        inset: 'auto 8px 8px auto',
        margin: 0,
        width: 'min(96vw, 420px)',
        maxHeight: '40vh',
        overflow: 'auto',
        background: 'var(--color-bg)',
        color: 'var(--color-ink)',
        border: '1px solid var(--color-line)',
        borderRadius: 12,
        padding: 8,
        font: '11px/1.35 ui-monospace, monospace',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <strong style={{ flex: 1 }}>
          {DIAG_LABELS.title} ({box.length}/{save.length})
        </strong>
        <button
          type="button"
          style={btn}
          onClick={() => {
            void navigator.clipboard
              ?.writeText(copyText({ box, save }))
              .then(() => setCopied(true))
              .catch(() => setCopied(false))
          }}
        >
          {copied ? DIAG_LABELS.copied : DIAG_LABELS.copy}
        </button>
        <button
          type="button"
          style={btn}
          onClick={() => {
            boxRef.current = []
            saveRef.current = []
            setBox([])
            setSave([])
            setCopied(false)
          }}
        >
          {DIAG_LABELS.clear}
        </button>
        <button
          type="button"
          aria-label={DIAG_LABELS.close}
          style={btn}
          onClick={() => setOpen(false)}
        >
          ✕
        </button>
      </div>
      {save.slice(0, 5).map((r) => (
        <div key={`s${r.t}`} data-save-row>
          {JSON.stringify(r)}
        </div>
      ))}
      {box.slice(0, 8).map((r) => (
        <div key={r.id} data-box-row>
          {r.type}
          {r.count > 1 ? ` x${r.count}` : ''} {r.pointerType} {r.target} t={r.t}{' '}
          {r.reaction}
        </div>
      ))}
    </div>
  )
}
