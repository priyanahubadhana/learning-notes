import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../app/tools/icons'
import { openInTopLayer, trapFocus } from '../../app/overlay'
import { MAX_NOTE_LENGTH } from '../../core/sourceCheck'
import { SheetBase } from '../../design/parts/SheetBase'
import { usePhone } from '../../design/parts/useAnchoredCard'
import { t } from '../../i18n/t'

/**
 * The read view of a sticky note (RD-B28): a small paper note with only ✏️
 * (edit) and ✕. The text is shown as plain text, never as HTML.
 */
export function StickyRead({
  text,
  canEdit,
  onEdit,
  onClose,
}: {
  text: string
  canEdit: boolean
  onEdit: () => void
  onClose: () => void
}) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    // Only Esc and a tap outside count as "close"; our own cleanup does not.
    let live = true
    const handle = openInTopLayer(el, {
      id: `sticky-read-${id}`,
      layer: 'sheet',
      onClose: () => {
        if (live) closeRef.current()
      },
      opener,
    })
    const release = trapFocus(el, opener)
    el.focus()
    return () => {
      live = false
      release()
      handle.close()
    }
  }, [id])
  return createPortal(
    <div
      ref={ref}
      className="rv2-stk-read"
      role="dialog"
      aria-label={t('readerv2.sticky.readLabel')}
      data-testid="rv2-sticky-read"
      tabIndex={-1}
      popover="manual"
    >
      <div className="rv2-stk-bar">
        {canEdit && (
          <button
            type="button"
            className="rv2-stk-btn"
            data-testid="rv2-sticky-edit"
            aria-label={t('readerv2.sticky.edit')}
            onClick={onEdit}
          >
            <Icon name="pen" size={16} />
          </button>
        )}
        <button
          type="button"
          className="rv2-stk-btn"
          data-testid="rv2-sticky-close"
          aria-label={t('readerv2.sticky.close')}
          onClick={onClose}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="rv2-stk-text" data-testid="rv2-sticky-text">
        {text ? text : <i>{t('readerv2.sticky.empty')}</i>}
      </div>
    </div>,
    document.body,
  )
}

/** The edit dialog (RD-B27, RD-B29): ✕ closes without changes, Save keeps the words. */
export function StickyEdit({
  initial,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  initial: string
  isNew: boolean
  onSave: (text: string) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [text, setText] = useState(initial)
  const empty = text.trim().length === 0
  const phone = usePhone()
  return (
    <TopSheet onClose={onClose}>
      <SheetBase
        mode="inline"
        phone={phone}
        title={t('readerv2.sticky.editTitle')}
        onClose={onClose}
        data-testid="rv2-sticky-edit-dialog"
        footer={
          <>
            {!isNew && onDelete && (
              <button
                type="button"
                className="rv2-stk-foot rv2-stk-foot--danger"
                data-testid="rv2-sticky-delete"
                onClick={onDelete}
              >
                {t('readerv2.sticky.delete')}
              </button>
            )}
            <span style={{ flex: 1 }} />
            <button
              type="button"
              className="rv2-stk-foot rv2-stk-foot--main"
              data-testid="rv2-sticky-save"
              disabled={empty}
              onClick={() => onSave(text.trim())}
            >
              {t('readerv2.sticky.save')}
            </button>
          </>
        }
      >
        <textarea
          data-autofocus
          data-testid="rv2-sticky-text-input"
          className="rv2-stk-input"
          rows={6}
          maxLength={MAX_NOTE_LENGTH}
          value={text}
          placeholder={t('readerv2.sticky.placeholder')}
          aria-label={t('readerv2.sticky.editTitle')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !empty)
              onSave(text.trim())
          }}
        />
      </SheetBase>
    </TopSheet>
  )
}

/**
 * A sheet in the browser top layer (above the reader bars, which live there
 * too), with the page dimmed behind it. Esc and a tap on the dim area close
 * it; focus is kept inside and returned.
 */
function TopSheet({
  onClose,
  children,
}: {
  onClose: () => void
  children: ReactNode
}) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    let live = true
    const handle = openInTopLayer(el, {
      id: `sticky-edit-${id}`,
      layer: 'sheet',
      onClose: () => {
        if (live) closeRef.current()
      },
      opener,
    })
    const release = trapFocus(el, opener)
    el.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => {
      live = false
      release()
      handle.close()
    }
  }, [id])
  return createPortal(
    <div
      ref={ref}
      className="rv2-stk-layer"
      popover="manual"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {children}
    </div>,
    document.body,
  )
}

/** The note while it is lifted and dragged: a small paper square that follows the pointer (top layer, never in the way of taps). */
export function StickyGhost({ x, y }: { x: number; y: number }) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handle = openInTopLayer(el, {
      id: `sticky-ghost-${id}`,
      layer: 'sheet',
      persistent: true,
    })
    return () => handle.close()
  }, [id])
  return createPortal(
    <div
      ref={ref}
      className="rv2-stk-ghost"
      data-testid="rv2-sticky-ghost"
      aria-hidden="true"
      popover="manual"
      style={{ left: x, top: y }}
    >
      <Icon name="tape" size={16} />
    </div>,
    document.body,
  )
}
