import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { t } from '../i18n/t'
import type { ToastAction } from './appUi'

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

export interface MenuItem {
  label: string
  icon: string
  onSelect: () => void
}

/**
 * Small menu that opens below a button (`anchor` is the button's position).
 * Closes on outside click, Esc, or choosing an item.
 */
export function MenuPopover({
  anchor,
  items,
  onClose,
}: {
  anchor: DOMRect
  items: MenuItem[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    ref.current?.querySelector('button')?.focus()
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close.current()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div
      ref={ref}
      role="menu"
      style={{
        left: Math.min(anchor.left, window.innerWidth - 230),
        top: Math.min(anchor.bottom + 6, window.innerHeight - 110),
      }}
      className="fixed z-20 w-52 rounded-[10px] border border-line bg-bg p-1.5 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onClick={() => {
            onClose()
            item.onSelect()
          }}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm outline-none hover:bg-hover focus:bg-hover"
        >
          <span aria-hidden className="w-5 text-center text-muted">
            {item.icon}
          </span>
          {item.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Short message at the bottom of the screen (render it only while shown).
 * An optional action (e.g. Undo) is a tap-sized button inside it.
 */
export function Toast({
  message,
  action,
}: {
  message: string
  action?: ToastAction
}) {
  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 z-40 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 rounded-[10px] bg-ink px-3.5 py-2 text-[13px] text-bg shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
    >
      <span>{message}</span>
      {action && (
        <button
          type="button"
          onClick={action.onSelect}
          className="-my-1 min-h-9 shrink-0 rounded-md px-2.5 font-semibold text-bg underline underline-offset-2 hover:bg-bg/15"
        >
          {action.label}
        </button>
      )}
    </div>
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

interface NameDialogProps {
  title: string
  label: string
  initialValue: string
  confirmLabel: string
  onConfirm: (name: string) => void
  onCancel: () => void
}

/**
 * Modal dialog asking for a name (e.g. "Save as template"). Enter saves,
 * Esc cancels. The text starts selected so typing replaces it.
 */
export function NameDialog({
  title,
  label,
  initialValue,
  confirmLabel,
  onConfirm,
  onCancel,
}: NameDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    ref.current?.showModal()
    input.current?.select()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={onCancel}
      onClick={(e) => {
        if (e.target === ref.current) onCancel() // click on the backdrop
      }}
      className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-bg p-5 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.14)] backdrop:bg-black/20"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onConfirm(value.trim())
        }}
      >
        <h2 className="mb-3 text-[15px] font-semibold">{title}</h2>
        <label
          className="mb-1.5 block text-xs text-muted"
          htmlFor="name-dialog"
        >
          {label}
        </label>
        <input
          id="name-dialog"
          ref={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mb-5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex justify-end gap-2 text-sm">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-9 rounded-lg px-3 py-1.5 text-muted hover:bg-hover hover:text-ink"
          >
            {t('dialog.cancel')}
          </button>
          <button
            type="submit"
            className="min-h-9 rounded-lg bg-accent px-3 py-1.5 font-medium text-white hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  )
}
