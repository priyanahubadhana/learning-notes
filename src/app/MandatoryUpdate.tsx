import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n/t'
import { mandatoryUpdate } from './mandatoryState'
import { flow } from './mandatoryFlow'

/**
 * The full-screen, mandatory update screen (BUG-004). Everything behind it
 * is inert, so nothing can be tapped or typed into while it shows.
 */
export default function MandatoryUpdate() {
  const s = mandatoryUpdate.useValue()
  const primary = useRef<HTMLButtonElement>(null)
  const active = s !== null

  // Block the app behind: no taps, no typing, no focus.
  useEffect(() => {
    if (!active) return
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    return () => root?.removeAttribute('inert')
  }, [active])

  const phase = s?.phase
  useEffect(() => {
    primary.current?.focus()
  }, [phase])

  if (!s) return null
  const pct =
    s.phase === 'downloading' && s.total > 0
      ? Math.min(100, Math.round((s.loaded / s.total) * 100))
      : null
  const button = 'min-h-11 min-w-28 rounded-xl px-5 text-sm font-semibold'
  let title = t('update.req.title')
  let body = t('update.req.body')
  if (s.phase === 'countdown') body = t('update.req.countdown', { s: s.left })
  if (s.phase === 'downloading')
    body = t('update.req.downloading', { pct: pct ?? 0 })
  if (s.phase === 'paused') body = t('update.req.paused')
  if (s.phase === 'installing') {
    title = t('update.req.installing')
    body = t('update.req.installingBody')
  }
  if (s.phase === 'failed')
    body = t(
      s.reason === 'unsaved' ? 'update.req.failedSave' : 'update.req.failed',
    )

  // Outside #root, which is inert while this shows.
  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="req-update-title"
      aria-describedby="req-update-body"
      data-mandatory-update
      data-phase={s.phase}
      onKeyDown={(e) => e.key === 'Escape' && e.preventDefault()}
      className="fixed inset-0 z-[2147483000] flex flex-col items-center justify-center gap-5 bg-bg px-8 text-center text-ink"
    >
      <h1 id="req-update-title" className="text-2xl font-semibold">
        {title}
      </h1>
      <p
        id="req-update-body"
        aria-live="polite"
        className="max-w-sm text-[15px] text-ink-soft"
      >
        {body}
      </p>
      {(s.phase === 'downloading' || s.phase === 'installing') && (
        <div
          role="progressbar"
          aria-label={title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct ?? undefined}
          className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-line"
        >
          <div
            className={`h-full bg-accent transition-[width] duration-300 ${pct === null ? 'w-1/3 animate-pulse' : ''}`}
            style={pct === null ? undefined : { width: `${pct}%` }}
          />
        </div>
      )}
      {(s.phase === 'countdown' || s.phase === 'downloading') && (
        <button
          ref={primary}
          type="button"
          onClick={() => flow()?.cancel()}
          className={`${button} border border-line text-ink hover:bg-hover`}
        >
          {t('dialog.cancel')}
        </button>
      )}
      {(s.phase === 'paused' || s.phase === 'failed') && (
        <button
          ref={primary}
          type="button"
          onClick={() => flow()?.retry()}
          className={`${button} bg-accent text-white hover:opacity-90`}
        >
          {t('update.req.retry')}
        </button>
      )}
    </div>,
    document.body,
  )
}
