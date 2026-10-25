import { useEffect, useRef, useState, type ComponentProps } from 'react'

/** Small UI building blocks shared across features. */

/** Quiet icon button (sidebar row actions, labels). */
export function IconButton({
  className = '',
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={`rounded-[5px] px-1.5 text-[15px] leading-6 text-muted hover:bg-hover hover:text-ink ${className}`}
      {...props}
    />
  )
}

/**
 * Inline name editor for sidebar rows. Enter or leaving the field saves
 * (empty = no change), Esc cancels. `onDone(null)` means "no change".
 */
export function RenameInput({
  initial,
  onDone,
  className = '',
}: {
  initial: string
  onDone: (name: string | null) => void
  className?: string
}) {
  const [value, setValue] = useState(initial)
  const cancelled = useRef(false)
  return (
    <input
      autoFocus
      value={value}
      aria-label="Name"
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const name = value.trim()
        onDone(cancelled.current || !name || name === initial ? null : name)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          cancelled.current = true
          e.currentTarget.blur()
        }
      }}
      className={`min-w-0 flex-1 rounded border border-line bg-bg px-1 outline-none focus:border-accent ${className}`}
    />
  )
}

interface ConfirmDialogProps {
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Modal confirm dialog. Uses the native <dialog>, so Esc cancels and focus
 * stays inside while it is open. Render it only while needed.
 */
export function ConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      onClick={(e) => {
        if (e.target === ref.current) onCancel() // click on the backdrop
      }}
      className="m-auto w-80 rounded-xl border border-line bg-bg p-5 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.14)] backdrop:bg-black/20"
    >
      <p className="mb-5 text-sm leading-relaxed">{message}</p>
      <div className="flex justify-end gap-2 text-sm">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-muted hover:bg-hover hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          autoFocus
          onClick={onConfirm}
          className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
