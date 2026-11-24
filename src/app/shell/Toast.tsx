import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Undo2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { t } from '../../i18n/t'
import { useKeyboardInset } from '../../settings/deviceModeSettings'
import { stackPositions } from '../overlay'
import { toastBottom } from '../toastTiming'
import { shellToasts, type ShellToasts } from './toastStore'
import { useTopLayer } from './useTopLayer'
import './shell-parts.css'

/**
 * SH-12: where the shell toast is drawn. Bottom centre, 24 px up (above the
 * tab bar on a phone, above the on-screen keyboard and its bar). It sits in
 * the top layer and never takes focus.
 */
export function ToastHost({ toasts = shellToasts }: { toasts?: ShellToasts }) {
  const toast = useSyncExternalStore(
    toasts.subscribe,
    toasts.current,
    toasts.current,
  )
  if (!toast) return null
  return <ToastView key={toast.id} toasts={toasts} />
}

function ToastView({ toasts }: { toasts: ShellToasts }) {
  const toast = toasts.current()
  const layer = useRef<HTMLDivElement | null>(null)
  const kb = useKeyboardInset()
  const card = useRef<HTMLDivElement | null>(null)
  const [top, setTop] = useState<number | null>(null)
  useTopLayer(layer)
  const id = toast?.id
  // A toast never covers a title: if it would, it moves up above it.
  useLayoutEffect(() => {
    const el = card.current
    if (!el) return
    const avoid = Array.from(
      document.querySelectorAll('[data-toast-avoid], [data-page-scroller] h1'),
    ).map((n) => n.getBoundingClientRect())
    const r = el.getBoundingClientRect()
    const [y] = stackPositions(
      [r.height],
      { width: window.innerWidth, height: r.bottom },
      avoid,
      { width: r.width, margin: 0, gap: 8 },
    )
    setTop(y !== undefined && y < r.top - 0.5 ? y : null)
  }, [id, kb])
  if (!toast) return null
  const bottom = toastBottom(kb)
  return createPortal(
    <div ref={layer} popover="manual" className="sh-layer">
      <div
        role="status"
        ref={card}
        data-testid="shell-toast"
        className="sh-toast"
        style={
          top !== null
            ? { top, bottom: 'auto' }
            : bottom
              ? { bottom }
              : undefined
        }
        onPointerEnter={toasts.hold}
        onPointerLeave={toasts.release}
        onPointerDown={toasts.hold}
        onPointerUp={toasts.release}
      >
        {toast.action && (
          // I1: closes the notice without doing the action.
          <button
            type="button"
            className="sh-toast-x"
            aria-label={t('popup.close')}
            onClick={() => toasts.dismiss()}
          >
            <span className="sh-toast-x-dot">
              <X size={10} strokeWidth={2.4} aria-hidden />
            </span>
          </button>
        )}
        <span className="sh-toast-msg">{toast.message}</span>
        {toast.action && (
          <button
            type="button"
            className="sh-toast-act"
            data-icon={toast.action.icon}
            onClick={() => toasts.undo()}
          >
            {toast.action.icon === 'undo' && <Undo2 size={16} aria-hidden />}
            {toast.action.label}
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
