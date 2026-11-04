import { Tip } from '../help/Help'
import type { TipId } from '../help/helpRegistry'
import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { usePopup } from './popups'
import { PopupHeader } from './tools/PopupClose'
import { t } from '../i18n/t'
import type { ChoiceRequest, ToastAction } from './appUi'

/** Small UI building blocks shared across features. */

/** The three lines of the phone menu button. */
export function MenuIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

/**
 * Quiet icon button (sidebar row actions, labels). `title` names it; with
 * `tip` it becomes the accessible name and the help tip explains it
 * (hidden with Show help off); without, it is the browser's hover text.
 */
export function IconButton({
  className = '',
  title,
  tip,
  ...props
}: ComponentProps<'button'> & { tip?: TipId }) {
  const button = (
    <button
      type="button"
      className={`rounded-[5px] px-1.5 text-[15px] leading-6 text-muted hover:bg-hover hover:text-ink ${className}`}
      title={tip ? undefined : title}
      aria-label={tip ? title : props['aria-label']}
      {...props}
    />
  )
  return tip ? (
    <Tip id={tip} touchInfo={false}>
      {button}
    </Tip>
  ) : (
    button
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
      aria-label={t('ui.name')}
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
  /** Greyed out, cannot be chosen. */
  disabled?: boolean
  /** Small text on the right, such as a shortcut. */
  hint?: string
}

/**
 * Small menu that opens below a button (`anchor` is the button's position).
 * Closes on outside click, Esc, or choosing an item; ↑ ↓ move between items.
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
  const top = Math.max(8, Math.min(anchor.bottom + 6, window.innerHeight - 110))
  // The shared pop-up rule (outside tap, Esc, scroll, one at a time).
  usePopup(true, onClose, (target) => ref.current?.contains(target) ?? false)

  useEffect(() => {
    ref.current
      ?.querySelector<HTMLElement>('button:enabled:not([data-popup-close])')
      ?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      e.preventDefault()
      const items = [
        ...(ref.current?.querySelectorAll<HTMLElement>(
          'button:enabled:not([data-popup-close])',
        ) ?? []),
      ]
      const at = items.indexOf(document.activeElement as HTMLElement)
      const step = e.key === 'ArrowDown' ? 1 : -1
      items[(at + step + items.length) % items.length]?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      ref={ref}
      role="menu"
      style={{
        left: Math.max(8, Math.min(anchor.left, window.innerWidth - 230)),
        top,
        // A long menu scrolls inside the screen instead of running off it.
        maxHeight: window.innerHeight - top - 8,
      }}
      className="fixed z-50 w-52 overflow-y-auto rounded-[10px] border border-line bg-bg p-1.5 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
    >
      <PopupHeader onClose={onClose} />
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            onClose()
            item.onSelect()
          }}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm outline-none enabled:hover:bg-hover enabled:focus:bg-hover disabled:text-muted any-pointer-coarse:min-h-11"
        >
          <span aria-hidden className="w-5 text-center text-muted">
            {item.icon}
          </span>
          <span className="flex-1">{item.label}</span>
          {item.hint && <span className="text-xs text-muted">{item.hint}</span>}
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
  onHold,
  onRelease,
}: {
  message: string
  action?: ToastAction
  /** The pointer is over the toast or it was tapped: keep it open. */
  onHold?: () => void
  /** The pointer left (or another tap elsewhere): let it close soon. */
  onRelease?: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const held = useRef(false)
  // A tap holds the toast; a tap anywhere else lets it go.
  useEffect(() => {
    if (!onRelease) return
    const away = (e: PointerEvent) => {
      if (held.current && !box.current?.contains(e.target as Node)) {
        held.current = false
        onRelease()
      }
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [onRelease])
  return (
    <div
      ref={box}
      onPointerEnter={() => {
        held.current = true
        onHold?.()
      }}
      onPointerDown={() => {
        held.current = true
        onHold?.()
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'touch') return
        held.current = false
        onRelease?.()
      }}
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
  /** Text of the button that backs out (default "Cancel"). */
  cancelLabel?: string
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
  cancelLabel,
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
          {cancelLabel ?? t('ui.cancel')}
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
  // A click outside closes only if nothing was typed; otherwise it asks.
  const [touched, setTouched] = useState(false)
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    ref.current?.showModal()
    input.current?.select()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={onCancel}
      onInput={() => setTouched(true)}
      onClick={(e) => {
        if (e.target !== ref.current) return // not the backdrop
        if (touched) setAsking(true)
        else onCancel()
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
      {asking && (
        <ConfirmDialog
          message={t('dialog.discard')}
          confirmLabel={t('dialog.discardButton')}
          cancelLabel={t('dialog.keepEditing')}
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false)
            onCancel()
          }}
        />
      )}
    </dialog>
  )
}

/**
 * Modal question with a few answer buttons (AppUi.choose). Esc or a click
 * outside cancels. The primary answer has focus, so Enter picks it.
 */
export function ChoiceDialog({
  request,
  onDone,
  onOpenSetting,
}: {
  request: ChoiceRequest
  onDone: (value: string | null) => void
  /** "Change in Settings" (closes the dialog as cancelled first). */
  onOpenSetting: (settingId: string) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    ref.current?.showModal()
    primary.current?.focus() // showModal would focus the first button
  }, [])
  const { settingId } = request

  return (
    <dialog
      ref={ref}
      aria-label={request.title}
      onCancel={() => onDone(null)}
      onClick={(e) => {
        if (e.target === ref.current) onDone(null) // click on the backdrop
      }}
      className="m-auto w-[min(27rem,calc(100vw-2rem))] rounded-xl border border-line bg-bg p-5 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.14)] backdrop:bg-black/20"
    >
      <h2 className="mb-1.5 text-[15px] font-semibold">{request.title}</h2>
      <p className="mb-5 text-sm leading-relaxed text-muted">
        {request.message}
      </p>
      <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
        {settingId && (
          <button
            type="button"
            onClick={() => {
              onDone(null)
              onOpenSetting(settingId)
            }}
            className="me-auto min-h-9 rounded-lg px-1 text-[13px] text-muted underline decoration-line underline-offset-4 hover:text-ink"
          >
            {t('dialog.changeInSettings')}
          </button>
        )}
        {request.options.map((option) => (
          <button
            key={option.value}
            type="button"
            ref={option.primary ? primary : undefined}
            onClick={() => onDone(option.value)}
            className={`min-h-9 rounded-lg px-3 py-1.5 ${
              option.primary
                ? 'bg-accent font-medium text-white hover:opacity-90'
                : 'border border-line hover:bg-hover'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </dialog>
  )
}
