import { centreEl } from './centreEl'
import { Tip } from '../help/Help'
import type { TipId } from '../help/helpRegistry'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from 'react'
import { createPortal } from 'react-dom'
import { usePopup } from './popups'
import { PopupHeader } from './tools/PopupClose'
import { t } from '../i18n/t'
import { touchUi } from './touchUi'
import { useKeyboardInset } from '../settings/deviceModeSettings'
import type { ChoiceRequest, ToastAction } from './appUi'
import { toastBottom } from './toastTiming'
import { Glyph, Icon } from './tools/icons'

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
  bare = false,
  tipClassName,
  ...props
}: ComponentProps<'button'> & {
  tip?: TipId
  /** No quiet default look: the caller styles the whole button. */
  bare?: boolean
  /** Layout of the help-tip wrapper (default: inline). */
  tipClassName?: string
}) {
  const button = (
    <button
      type="button"
      className={`${bare ? '' : 'rounded-[5px] px-1.5 text-[15px] leading-6 text-muted hover:bg-hover hover:text-ink'} ${className}`}
      title={tip ? undefined : title}
      aria-label={tip ? title : props['aria-label']}
      {...props}
    />
  )
  return tip ? (
    <Tip id={tip} touchInfo={false} className={tipClassName}>
      {button}
    </Tip>
  ) : (
    button
  )
}

/** The ⋯ of a sidebar row on touch and Pencil devices (a 44 px target). */
export function RowMenuButton({
  name,
  onOpen,
  narrowToo = false,
}: {
  name: string
  onOpen: (anchor: DOMRect) => void
  /** Also for a mouse when the row (an `@container`) is narrow. */
  narrowToo?: boolean
}) {
  return (
    <IconButton
      title={t('sidebar.rowMenu', { name })}
      tip="sidebar.rowMenu"
      className={`hidden items-center justify-center any-pointer-coarse:flex [@media(any-pointer:coarse)]:min-w-[44px]! ${narrowToo ? '@max-[19rem]:flex' : ''}`}
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
    >
      ⋯
    </IconButton>
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

/**
 * The one empty screen of the app: an icon, one line that says what this is
 * and one primary button that does the single next step.
 */
export function EmptyState({
  icon,
  text,
  action,
  onAction,
  testId = 'empty-state',
  className = '',
}: {
  icon: string
  text: string
  /** The label of the one button (leave out when there is nothing to press). */
  action?: string
  onAction?: () => void
  testId?: string
  className?: string
}) {
  return (
    <div
      data-testid={testId}
      className={`flex flex-col items-center gap-2 rounded-xl border border-dashed border-line p-5 text-center ${className}`}
    >
      <span aria-hidden className="text-2xl">
        <Glyph icon={icon} size={28} />
      </span>
      <p className="max-w-md text-sm text-muted">{text}</p>
      {action && onAction && (
        <button
          type="button"
          data-testid={`${testId}-action`}
          onClick={onAction}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
        >
          {action}
        </button>
      )}
    </div>
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
  /** A second line under the label (one short sentence). */
  description?: string
  /** A choice in a list: true shows a tick (the current choice). */
  checked?: boolean
  /** Opens a small list of its own (shown with ▸) instead of doing something. */
  submenu?: MenuItem[]
  /** Destroys something: shown in red and always listed last. */
  danger?: boolean
  /** Red but kept where it was put, not moved to the end. */
  inPlace?: boolean
}

/**
 * Small menu that opens below a button (`anchor` is the button's position).
 * Closes on outside click, Esc, or choosing an item; ↑ ↓ move between items.
 */
export function MenuPopover({
  anchor,
  items,
  onClose,
  label,
  opener,
  onDone,
}: {
  anchor: DOMRect
  items: MenuItem[]
  onClose: () => void
  /** Accessible name of the list (a submenu is named after its item). */
  label?: string
  /** The item that opened this list (a submenu), so its parent stays open. */
  opener?: Element | null
  /** A submenu: closes the whole chain after a choice. */
  onDone?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const nested = !!opener
  const top = nested
    ? Math.max(8, Math.min(anchor.top, window.innerHeight - 260))
    : Math.max(8, Math.min(anchor.bottom + 6, window.innerHeight - 110))
  const [sub, setSub] = useState<{
    item: MenuItem
    at: DOMRect
    el: Element
  } | null>(null)
  // Owner bug batch 2, item 4: the menu is measured and kept inside what
  // the person can see (the visual viewport: the keyboard and pinch-zoom
  // shrink it). Near the bottom it flips above the point; it never leaves
  // the left or right edge.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const vv = window.visualViewport
    const vw = vv?.width ?? window.innerWidth
    const vh = vv?.height ?? window.innerHeight
    const ox = vv?.offsetLeft ?? 0
    const oy = vv?.offsetTop ?? 0
    const room = vh - 16
    const h = Math.min(el.scrollHeight, room)
    const w = el.offsetWidth
    let y: number
    if (nested) y = anchor.top
    else if (anchor.bottom + 6 + h <= oy + vh - 8) y = anchor.bottom + 6
    else if (anchor.top - 6 - h >= oy + 8) y = anchor.top - 6 - h
    else y = oy + vh - h - 8
    y = Math.max(oy + 8, Math.min(y, oy + vh - h - 8))
    const x = Math.max(
      ox + 8,
      Math.min(anchor.left + (nested ? 12 : 0), ox + vw - w - 8),
    )
    el.style.left = x + 'px'
    el.style.top = y + 'px'
    el.style.maxHeight = room + 'px'
  })
  // Esc gives the focus back to the button that opened the menu.
  const [returnTo] = useState(
    () => document.activeElement as HTMLElement | null,
  )
  // The shared pop-up rule (outside tap, Esc, scroll, one at a time).
  usePopup(true, onClose, (target) => ref.current?.contains(target) ?? false, {
    opener,
    onEscape: () => returnTo?.focus({ preventScroll: true }),
  })

  useEffect(() => {
    ref.current
      ?.querySelector<HTMLElement>('button:enabled:not([data-popup-close])')
      ?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      // A submenu opened from here has its own arrows.
      if (!ref.current?.contains(document.activeElement)) return
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

  // In the body, not in the sidebar: a scrolling sidebar would hide it behind the page.
  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      style={{
        left: Math.max(
          8,
          Math.min(
            anchor.left + (nested ? 12 : 0),
            window.innerWidth - (nested ? 270 : 230),
          ),
        ),
        top,
        // A long menu scrolls inside the screen instead of running off it.
        maxHeight: window.innerHeight - top - 8,
      }}
      className={`fixed z-50 ${nested ? 'w-64' : 'w-52'} glass overflow-y-auto rounded-xl p-1 text-ink`}
    >
      <PopupHeader onClose={onDone ?? onClose} />
      {/* Destructive items are red and come last. */}
      {[
        ...items.filter((i) => !i.danger || i.inPlace),
        ...items.filter((i) => i.danger && !i.inPlace),
      ].map((item) => (
        <button
          key={item.label}
          type="button"
          role={item.checked !== undefined ? 'menuitemradio' : 'menuitem'}
          aria-checked={item.checked}
          aria-haspopup={item.submenu ? 'menu' : undefined}
          aria-expanded={item.submenu ? sub?.item === item : undefined}
          disabled={item.disabled}
          onClick={(e) => {
            if (item.submenu) {
              const el = e.currentTarget
              setSub(
                sub?.item === item
                  ? null
                  : { item, at: el.getBoundingClientRect(), el },
              )
              return
            }
            onClose()
            onDone?.()
            item.onSelect()
          }}
          className={`flex min-h-11 w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm outline-none enabled:hover:bg-hover enabled:focus:bg-hover disabled:text-muted ${
            item.danger ? 'text-danger' : ''
          }`}
        >
          <span
            aria-hidden
            className={`w-5 text-center ${item.danger ? 'text-danger' : 'text-muted'}`}
          >
            {item.checked !== undefined ? (
              item.checked ? (
                <Icon name="check" size={16} />
              ) : (
                ''
              )
            ) : (
              <Glyph icon={item.icon} />
            )}
          </span>
          <span className="flex-1">
            {item.label}
            {item.description && (
              <span className="block text-xs text-muted">
                {item.description}
              </span>
            )}
          </span>
          {item.hint && <span className="text-xs text-muted">{item.hint}</span>}
          {item.submenu && (
            <span aria-hidden className="text-muted">
              ▸
            </span>
          )}
        </button>
      ))}
      {sub?.item.submenu &&
        createPortal(
          <MenuPopover
            anchor={sub.at}
            items={sub.item.submenu}
            label={sub.item.label}
            opener={sub.el}
            onClose={() => setSub(null)}
            onDone={() => {
              setSub(null)
              onClose()
              onDone?.()
            }}
          />,
          document.body,
        )}
    </div>,
    document.body,
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
  // B3-11: above the on-screen keyboard and its 44 px bar, never under them.
  const kb = useKeyboardInset()
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
      ref={(el) => {
        box.current = el
        centreEl(el)
      }}
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
      data-chrome
      // R6-21: a tap on a toast (Undo, Unlock) is not a tap "outside" the
      // open options pill. The pill used to close, and the page jumped up by
      // the pill's height (62 px) under the person's pen.
      data-popup-trigger
      data-toast
      style={{ bottom: toastBottom(kb) }}
      className="fixed bottom-5 left-1/2 z-40 flex max-w-[calc(100vw-32px)] items-center gap-3 rounded-xl border border-line bg-surface-3 px-3.5 py-2 text-[13px] text-ink shadow-[var(--elev-2)]"
    >
      <span>{message}</span>
      {action && (
        <button
          type="button"
          onClick={action.onSelect}
          className="-my-1 min-h-9 shrink-0 rounded-md px-2.5 font-semibold text-accent underline underline-offset-2 hover:bg-hover"
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
      data-palm-guard
      onCancel={onCancel}
      onClick={(e) => {
        if (e.target === ref.current) onCancel() // click on the backdrop
      }}
      className="m-auto w-80 rounded-xl border border-line bg-surface-3 p-5 text-ink shadow-[var(--elev-3)] backdrop:bg-[var(--scrim)]"
    >
      <p className="mb-5 text-sm leading-relaxed">{message}</p>
      <div className="flex justify-end gap-2 text-sm">
        <button
          type="button"
          // On touch, Cancel has the focus, so a stray Enter or tap cannot delete.
          autoFocus={touchUi()}
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-muted hover:bg-hover hover:text-ink any-pointer-coarse:min-h-11 any-pointer-coarse:px-4"
        >
          {cancelLabel ?? t('ui.cancel')}
        </button>
        <button
          type="button"
          autoFocus={!touchUi()}
          onClick={onConfirm}
          className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 any-pointer-coarse:min-h-11 any-pointer-coarse:px-4"
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
      className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface-3 p-5 text-ink shadow-[var(--elev-3)] backdrop:bg-[var(--scrim)]"
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
          className="mb-5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent any-pointer-coarse:min-h-14 any-pointer-coarse:text-lg"
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
      className="m-auto w-[min(27rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface-3 p-5 text-ink shadow-[var(--elev-3)] backdrop:bg-[var(--scrim)]"
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
