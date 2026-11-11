import { useEffect, useRef, type ReactNode } from 'react'
import { t } from '../../i18n/t'

/**
 * The frame every PDF tool opens in: a full-screen sheet with a title and a
 * close button; Escape closes it. Focus moves in when it opens and the page
 * behind stays still.
 */
export function Shell({
  title,
  testId,
  onClose,
  children,
  footer,
  busy = false,
}: {
  title: string
  testId: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Something is being saved: closing waits. */
  busy?: boolean
}) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    box.current?.focus()
  }, [])
  return (
    <div
      ref={box}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-busy={busy}
      data-chrome
      data-ink-ui
      data-testid={testId}
      className="pointer-events-auto fixed inset-0 z-[80] flex flex-col bg-bg outline-none"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !busy) onClose()
      }}
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold">
          {title}
        </h2>
        <button
          type="button"
          data-testid="pdftools-close"
          aria-label={t('pdftools.close')}
          disabled={busy}
          onClick={onClose}
          className="min-h-11 min-w-11 rounded-lg hover:bg-hover disabled:opacity-50"
        >
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {footer}
        </div>
      )}
    </div>
  )
}

export const btnClass =
  'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-40 disabled:hover:bg-transparent'
export const mainBtnClass =
  'min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50'
