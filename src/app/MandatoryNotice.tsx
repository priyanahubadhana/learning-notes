import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n/t'
import { COUNTDOWN_S, flow } from './mandatoryFlow'
import type { MandatoryState } from './mandatoryState'
import type { UpdateReason } from './updateLevel'
import { useUnlocked } from '../settings/level'

/** Fades a block in (200 ms, scale .96 to 1); instant when motion is reduced. */
function useFadeIn(ref: React.RefObject<HTMLElement | null>, key: string) {
  useEffect(() => {
    const el = ref.current
    if (!el || typeof el.animate !== 'function') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    el.animate(
      [
        { opacity: 0, transform: 'scale(.96)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' },
    )
  }, [ref, key])
}

const RING = 56
const STROKE = 4
const R = (RING - STROKE) / 2
const C = 2 * Math.PI * R

/** The 5 second ring. The number changes each second; the ring glides unless motion is reduced. */
function Ring({ left }: { left: number }) {
  return (
    <div
      aria-hidden="true"
      data-countdown-ring
      className="relative h-14 w-14 shrink-0"
    >
      <svg viewBox={`0 0 ${RING} ${RING}`} className="-rotate-90">
        <circle
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-line"
        />
        <circle
          data-ring-arc
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - left / COUNTDOWN_S)}
          className="stroke-accent transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none"
        />
      </svg>
      <span
        data-countdown-number
        className="absolute inset-0 flex items-center justify-center text-xl font-semibold tabular-nums"
      >
        {left}
      </span>
    </div>
  )
}

const btn =
  'min-h-[44px] min-w-[112px] rounded-xl px-5 text-sm font-semibold phone:w-full'
const primaryBtn = `${btn} bg-accent text-white hover:opacity-90`
const tonalBtn = `${btn} bg-hover text-ink hover:opacity-90`

/** The full-screen must-have update notice (update.v2): countdown, download, install. */
export default function MandatoryNotice({
  s,
  reason,
}: {
  s: MandatoryState
  reason: UpdateReason
}) {
  const primary = useRef<HTMLButtonElement>(null)
  const column = useRef<HTMLDivElement>(null)
  const phaseText = useRef<HTMLDivElement>(null)
  // Professional (unlock about.version): the reason opens a plain explanation.
  const canExplain = useUnlocked('about.version')
  const [explain, setExplain] = useState(false)
  useFadeIn(column, 'open')
  useFadeIn(phaseText, s.phase)

  const phase = s.phase
  useEffect(() => {
    primary.current?.focus()
  }, [phase])

  // While installing nothing may be pressed (Esc included).
  useEffect(() => {
    if (phase !== 'installing') return
    const block = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', block, true)
    return () => window.removeEventListener('keydown', block, true)
  }, [phase])

  const pct =
    s.phase === 'downloading' && s.total > 0
      ? Math.min(100, Math.round((s.loaded / s.total) * 100))
      : null
  const reasonText = t(
    reason === 'datafix'
      ? 'update.v2.reasonDatafix'
      : 'update.v2.reasonStorage',
  )
  const failedText = t(
    s.phase === 'failed' && s.reason === 'unsaved'
      ? 'update.v2.unsaved'
      : 'update.v2.notFinished',
  )
  // Announced once per phase, never every second.
  let announce = ''
  if (s.phase === 'countdown')
    announce = t('update.v2.announceCountdown', { s: COUNTDOWN_S })
  if (s.phase === 'downloading') announce = t('update.v2.announceDownloading')
  if (s.phase === 'paused') announce = t('update.v2.paused')
  if (s.phase === 'installing') announce = t('update.v2.installing')
  if (s.phase === 'failed') announce = failedText

  const title =
    s.phase === 'installing'
      ? t('update.v2.installing')
      : s.phase === 'failed'
        ? failedText
        : t('update.v2.title')

  if (s.phase === 'offline') {
    // Never blocks the app: a small note; the countdown starts by itself.
    return (
      <div
        role="status"
        aria-live="polite"
        data-mandatory-update
        data-phase="offline"
        className="fixed bottom-4 left-4 right-4 z-[2147483000] mx-auto max-w-[420px] rounded-xl border border-line bg-surface-3 px-4 py-3 text-[13px] text-ink shadow-[var(--elev-2)]"
      >
        {t('update.v2.offline')}
      </div>
    )
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="req-update-title"
      aria-describedby="req-update-reason"
      data-mandatory-update
      data-phase={s.phase}
      onKeyDown={(e) => e.key === 'Escape' && e.preventDefault()}
      className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-bg px-4 text-ink"
    >
      <div
        ref={column}
        className="flex w-full max-w-[420px] flex-col items-center gap-4 text-center"
      >
        <h1 id="req-update-title" className="text-[22px] font-semibold">
          {title}
        </h1>
        {canExplain ? (
          <button
            id="req-update-reason"
            type="button"
            data-update-reason
            aria-haspopup="dialog"
            onClick={() => setExplain(true)}
            className="min-h-[44px] rounded-xl px-3 text-[15px] underline decoration-dotted underline-offset-4"
          >
            {reasonText}
          </button>
        ) : (
          <p id="req-update-reason" data-update-reason className="text-[15px]">
            {reasonText}
          </p>
        )}
        {explain && (
          <div
            role="dialog"
            aria-label={reasonText}
            data-update-details
            className="relative w-full rounded-xl border border-line bg-surface-3 p-4 pr-12 text-left text-[15px] shadow-[var(--elev-2)]"
          >
            <p>
              {t(
                reason === 'datafix'
                  ? 'update.v2.detailsDatafix'
                  : 'update.v2.detailsStorage',
              )}
            </p>
            <button
              type="button"
              aria-label={t('update.v2.close')}
              onClick={() => setExplain(false)}
              className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-xl hover:bg-hover"
            >
              ✕
            </button>
          </div>
        )}
        <div
          ref={phaseText}
          className="flex w-full flex-col items-center gap-4"
        >
          {s.phase === 'countdown' && (
            <>
              <p className="text-[13px] text-ink-soft" aria-hidden="true">
                {t('update.v2.countdown')}
              </p>
              <Ring left={s.left} />
            </>
          )}
          {s.phase === 'paused' && (
            <p className="text-[15px]" data-update-paused>
              {t('update.v2.paused')}
            </p>
          )}
          {s.phase === 'downloading' && (
            <>
              <p className="text-[13px] text-ink-soft" data-update-eta>
                {t('update.v2.downloading')}
                {s.etaS ? ` · ${t('update.v2.eta', { s: s.etaS })}` : ''}
              </p>
              <div className="flex w-full items-center gap-3">
                <div
                  role="progressbar"
                  aria-label={t('update.v2.downloading')}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct ?? undefined}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
                >
                  <div
                    className={`h-full bg-accent transition-[width] duration-300 motion-reduce:transition-none ${pct === null ? 'w-1/3' : ''}`}
                    style={pct === null ? undefined : { width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-[13px] tabular-nums">
                  {pct ?? 0}%
                </span>
              </div>
            </>
          )}
          {s.phase === 'installing' && (
            <div
              role="progressbar"
              aria-label={t('update.v2.installing')}
              className="h-1.5 w-full overflow-hidden rounded-full bg-line"
            >
              <div className="h-full w-1/3 bg-accent motion-safe:animate-pulse" />
            </div>
          )}
          {s.phase === 'failed' && s.reason === 'unsaved' && (
            <p className="text-[15px]">{t('update.req.failedSave')}</p>
          )}
          {s.phase === 'failed' && s.reason !== 'unsaved' && (
            <p className="text-[15px]">{t('update.req.failed')}</p>
          )}
        </div>
        <div aria-live="polite" role="status" className="sr-only">
          {announce}
        </div>
        <div className="flex w-full flex-wrap justify-center gap-3 phone:flex-col">
          {(s.phase === 'countdown' || s.phase === 'downloading') && (
            <button
              ref={primary}
              type="button"
              onClick={() => flow()?.cancel()}
              className={tonalBtn}
            >
              {s.phase === 'countdown'
                ? t('update.v2.notNow')
                : t('dialog.cancel')}
            </button>
          )}
          {(s.phase === 'paused' || s.phase === 'failed') && (
            <button
              ref={primary}
              type="button"
              onClick={() => flow()?.retry()}
              className={primaryBtn}
            >
              {s.phase === 'paused'
                ? t('update.v2.updateNow')
                : t('update.v2.tryAgain')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
