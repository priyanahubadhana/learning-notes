import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../../i18n/t'
import { useOverlayLayer } from './useOverlayLayer'
import { useTopLayer } from './useTopLayer'
import './shell-parts.css'

export interface DialogProps {
  title: string
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  /** The action is red and the dialog says "You can undo this." */
  destructive?: boolean
  /** Changes the line under a destructive dialog. */
  undoNote?: string
  confirmDisabled?: boolean
  /** The sheet this dialog was opened from; it stays open. */
  parentId?: string
  id?: string
}

/**
 * SH-10: the one small dialog. Centred, 420 wide at most, ✕ top right,
 * Cancel and one action. Enter confirms, Esc cancels, Tab stays inside, and
 * the first field is focused. It replaces ConfirmDialog, NameDialog,
 * ChoiceDialog and NameSheet when the new shell is on.
 */
export function Dialog(props: DialogProps) {
  const {
    title,
    children,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
    destructive,
    undoNote,
    confirmDisabled,
    parentId,
  } = props
  const auto = useId()
  const id = props.id ?? `dialog-${auto}`
  const layer = useRef<HTMLDivElement | null>(null)
  const box = useRef<HTMLDivElement | null>(null)
  useTopLayer(layer)
  useOverlayLayer(box, {
    id,
    layer: 'dialog',
    modal: true,
    trap: true,
    parentId,
    onClose: onCancel,
  })

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.defaultPrevented) return
    const el = e.target as HTMLElement
    // A button keeps its own Enter; a text area keeps its line break.
    if (el.tagName === 'BUTTON' || el.tagName === 'TEXTAREA') return
    if (confirmDisabled) return
    e.preventDefault()
    onConfirm()
  }

  return createPortal(
    <div
      ref={layer}
      popover="manual"
      className="sh-layer sh-layer-dialog"
      data-testid="shell-dialog-layer"
    >
      <div className="sh-dscrim" aria-hidden="true" />
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        className="sh-dialog"
        data-testid="shell-dialog"
        data-destructive={destructive ? '' : undefined}
        onKeyDown={onKeyDown}
      >
        <button
          type="button"
          className="sh-x"
          aria-label={t('shell.close')}
          onClick={onCancel}
        >
          ✕
        </button>
        <h2 id={`${id}-title`} className="sh-dialog-title">
          {title}
        </h2>
        {children && <div className="sh-dialog-body">{children}</div>}
        {destructive && (
          <p className="sh-dialog-undo">
            {undoNote ?? t('shell.dialog.undoNote')}
          </p>
        )}
        <div className="sh-dialog-foot">
          <button type="button" className="sh-btn" onClick={onCancel}>
            {cancelLabel ?? t('ui.cancel')}
          </button>
          <button
            type="button"
            className={
              destructive ? 'sh-btn sh-btn-danger' : 'sh-btn sh-btn-main'
            }
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
