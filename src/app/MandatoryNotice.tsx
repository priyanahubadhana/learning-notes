import { useEffect, useRef, useState } from 'react'
import {
  CirclePause,
  Download,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { t } from '../i18n/t'
import { COUNTDOWN_S, flow } from './mandatoryFlow'
import {
  MANDATORY_TOP,
  mandatoryFailure,
  type MandatoryState,
} from './mandatoryState'
import { failureNote } from './failureNote'
import { isPreviewHost } from './flags'
import { onRouted } from './input/eventRouter'
import type { UpdateReason } from './updateLevel'
import { sizeText, timeLeftText } from './updateTexts'
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
          className="stroke-neutral-fill"
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
  'inline-flex min-h-[44px] min-w-[112px] items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold phone:w-full'
const primaryBtn = `${btn} bg-accent text-on-accent hover:bg-accent-hover`
const tonalBtn = `${btn} bg-neutral-fill text-ink hover:bg-hover`

/** The round icon of a step (the picture: 56 px, soft accent or warning). */
function StepIcon({
  children,
  warn,
}: {
  children: React.ReactNode
  warn?: boolean
}) {
  return (
    <div
      aria-hidden="true"
      data-update-icon
      className={`flex h-14 w-14 items-center justify-center rounded-full ${warn ? 'bg-warn-soft text-warn' : 'bg-accent-soft text-accent'}`}
    >
      {children}
    </div>
  )
}

/** The failed step in plain words, for "Copy details". */
function detailsText(s: MandatoryState): string {
  if (s.phase === 'failed' && s.reason === 'unsaved')
    return t('update.v2.detailUnsaved')
  const f = mandatoryFailure.get()
  return t(
    f?.what === 'download'
      ? 'update.v2.detailDownload'
      : 'update.v2.detailRestart',
    { s: String(Math.round((f?.waitedMs ?? 0) / 1000)) },
  )
}

/** The line under the buttons: what "Not now" does, and Copy details. */
/** Where the notes area is centred (iPad sideways: not the whole screen). */
function useNotesCentre(): number | null {
  const [x, setX] = useState<number | null>(null)
  useEffect(() => {
    const el = document.querySelector('[data-page-scroller]')
    if (!el) return
    const read = () => {
      const r = el.getBoundingClientRect()
      setX(r.left + r.width / 2)
    }
    const ro = new ResizeObserver(read)
    ro.observe(el)
    window.addEventListener('resize', read)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', read)
    }
  }, [])
  return x
}

function FailedLinks({
  s,
  canLeave,
}: {
  s: MandatoryState
  canLeave: boolean
}) {
  // Mounted only on this screen, so "Copied" starts fresh each time.
  const [copied, setCopied] = useState(false)
  return (
    <p className="mt-3.5 flex flex-wrap items-center justify-center gap-x-1 text-[13px] text-muted">
      {canLeave && <span>{t('update.v2.leaveHint')} ·</span>}
      <button
        type="button"
        data-update-copy
        onClick={() => {
          void navigator.clipboard
            ?.writeText(detailsText(s))
            .then(() => setCopied(true))
            .catch(() => {})
        }}
        className="min-h-[44px] rounded-lg px-2 font-semibold text-accent"
      >
        {copied ? t('update.v2.copied') : t('update.v2.copyDetails')}
      </button>
    </p>
  )
}

/** The must-have update notice (update.v2): every step has a way forward. */
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
  // The focus ring shows only after a key press (never after a tap).
  const [keys, setKeys] = useState(false)
  const centre = useNotesCentre()
  useFadeIn(column, 'open')
  useFadeIn(phaseText, s.phase)

  const phase = s.phase
  useEffect(() => {
    primary.current?.focus()
  }, [phase])

  // While installing nothing may be pressed (Esc included).
  useEffect(() => {
    if (phase !== 'installing') return
    // Above every other keyboard owner, including a running gesture.
    return onRouted(
      'keydown',
      (e) => {
        e.preventDefault()
        e.stopPropagation()
        return true
      },
      { priority: 2000, name: 'mandatory-installing' },
    )
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
        : s.phase === 'paused'
          ? t('update.v2.pausedTitle')
          : s.phase === 'downloading'
            ? t('update.v2.downloading')
            : t('update.v2.title')

  if (s.phase === 'offline') {
    // Never blocks the app: a small note; the countdown starts by itself.
    return (
      <div
        role="status"
        aria-live="polite"
        data-mandatory-update
        data-phase="offline"
        className={`fixed bottom-4 left-4 right-4 phone:bottom-[calc(env(safe-area-inset-bottom)+76px)] ${MANDATORY_TOP} mx-auto max-w-[420px] rounded-xl border border-line bg-surface-3 px-4 py-3 text-[13px] text-ink shadow-[var(--elev-2)]`}
      >
        {t('update.v2.offline')}
      </div>
    )
  }

  if (s.phase === 'waiting') {
    // After "Not now": the app is open; a small pill offers Try again.
    return (
      <div
        role="status"
        data-update-waiting
        style={centre === null ? { left: '50%' } : { left: centre }}
        className={`fixed bottom-[max(24px,env(safe-area-inset-bottom))] phone:bottom-[calc(env(safe-area-inset-bottom)+76px)] ${MANDATORY_TOP} flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full bg-surface-3 py-1.5 pl-4 pr-1.5 text-sm text-ink shadow-[0_0_0_1px_var(--color-line),var(--elev-3)]`}
      >
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-warn" />
        {t('update.v2.waiting')}
        <button
          type="button"
          onClick={() => flow()?.retry()}
          className="inline-flex min-h-[44px] items-center rounded-full bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover"
        >
          {t('update.v2.tryAgain')}
        </button>
      </div>
    )
  }

  const canLeave = s.phase === 'failed' && !!flow()?.canDismiss()
  const eta =
    s.phase === 'downloading'
      ? s.etaS
        ? timeLeftText(s.etaS)
        : t('update.v2.measuring')
      : ''

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="req-update-title"
      aria-describedby="req-update-reason"
      data-mandatory-update
      data-phase={s.phase}
      onKeyDown={(e) => {
        setKeys(true)
        if (e.key === 'Escape') e.preventDefault()
      }}
      className={`${keys ? '' : '[&_button:focus-visible]:outline-none '}fixed inset-0 ${MANDATORY_TOP} flex items-center justify-center overflow-y-auto bg-bg px-4 py-8 text-ink`}
    >
      <div
        ref={column}
        className="flex w-full max-w-[420px] flex-col items-center text-center"
      >
        <div className="mb-[22px]">
          {s.phase === 'countdown' && <Ring left={s.left} />}
          {s.phase === 'downloading' && (
            <StepIcon>
              <Download size={26} strokeWidth={1.6} />
            </StepIcon>
          )}
          {s.phase === 'installing' && (
            <StepIcon>
              <ShieldCheck size={26} strokeWidth={1.6} />
            </StepIcon>
          )}
          {s.phase === 'paused' && (
            <StepIcon>
              <CirclePause size={24} strokeWidth={1.6} />
            </StepIcon>
          )}
          {s.phase === 'failed' && (
            <StepIcon warn>
              <TriangleAlert size={26} strokeWidth={1.6} />
            </StepIcon>
          )}
        </div>
        <h1
          id="req-update-title"
          className="mb-1.5 text-[22px] font-semibold tracking-[-0.005em]"
        >
          {title}
        </h1>
        {canExplain ? (
          <button
            id="req-update-reason"
            type="button"
            data-update-reason
            aria-haspopup="dialog"
            onClick={() => setExplain(true)}
            className="min-h-[44px] rounded-xl px-3 text-[15px] text-ink-soft underline decoration-line-strong decoration-dotted underline-offset-4"
          >
            {reasonText}
          </button>
        ) : (
          <p
            id="req-update-reason"
            data-update-reason
            className="mb-1.5 text-[15px] text-ink-soft underline decoration-line-strong decoration-dotted underline-offset-4"
          >
            {reasonText}
          </p>
        )}
        {explain && (
          <div
            role="dialog"
            aria-label={reasonText}
            data-update-details
            className="relative mt-2 w-full rounded-xl border border-line bg-surface-3 p-4 pr-12 text-left text-[15px] shadow-[var(--elev-2)]"
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
        <div ref={phaseText} className="flex w-full flex-col items-center">
          {s.phase === 'countdown' && (
            <>
              <p
                data-update-starts
                className="text-[13px] tabular-nums text-muted"
              >
                {s.left === 1
                  ? t('update.v2.startsIn1')
                  : t('update.v2.startsIn', { s: s.left })}
              </p>
              <p className="mt-2 text-[15px] text-ink-soft">
                {t('update.v2.keptBody')}
              </p>
            </>
          )}
          {s.phase === 'paused' && (
            <p className="mt-2 text-[15px] text-ink-soft" data-update-paused>
              {t('update.v2.pausedBody')}
            </p>
          )}
          {s.phase === 'downloading' && (
            <>
              <div className="mb-2.5 mt-[22px] flex w-full items-center gap-2.5">
                <div
                  role="progressbar"
                  aria-label={t('update.v2.downloading')}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct ?? undefined}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-fill"
                >
                  <div
                    className={`h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none ${pct === null ? 'w-1/3' : ''}`}
                    style={pct === null ? undefined : { width: `${pct}%` }}
                  />
                </div>
                <span
                  data-update-percent
                  className="min-w-[46px] rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-accent"
                >
                  {pct ?? 0}%
                </span>
              </div>
              <p
                className="text-[13px] tabular-nums text-muted"
                data-update-eta
              >
                {s.total > 0 ? `${sizeText(s.loaded, s.total)} · ` : ''}
                {eta}
              </p>
              {s.slow && (
                <div
                  role="status"
                  data-update-slow
                  className="mt-4 flex w-full items-start gap-2.5 rounded-xl bg-neutral-fill px-3.5 py-3 text-left text-[13px] text-ink-soft"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width={18}
                    height={18}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-px shrink-0 text-warn"
                  >
                    <path d="M12 20h.01" />
                    <path d="M8.5 16.4a5 5 0 0 1 7 0" />
                    <path d="M5 12.9a10 10 0 0 1 14 0" opacity=".35" />
                    <path d="M2 8.8a15 15 0 0 1 20 0" opacity=".35" />
                  </svg>
                  <span>
                    {(s.bps ?? 0) < 1000
                      ? t('update.v2.slowNone')
                      : t('update.v2.slow', {
                          k: Math.round((s.bps ?? 0) / 1000),
                        })}
                  </span>
                </div>
              )}
            </>
          )}
          {s.phase === 'installing' && (
            <>
              <div
                role="progressbar"
                aria-label={t('update.v2.installing')}
                className="mb-2.5 mt-[22px] h-1.5 w-full overflow-hidden rounded-full bg-neutral-fill"
              >
                <div className="ml-[22%] h-full w-[36%] rounded-full bg-accent motion-safe:animate-pulse" />
              </div>
              <p className="text-[13px] text-muted">
                {t('update.v2.installBody')}
              </p>
            </>
          )}
          {s.phase === 'failed' && (
            <>
              <p className="mt-2 text-[15px] text-ink-soft">
                {s.reason === 'unsaved'
                  ? t('update.req.failedSave')
                  : t('update.v2.failedBody')}
              </p>
              {s.reason !== 'unsaved' && isPreviewHost() && (
                <p data-failure-note className="mt-1 text-xs text-muted">
                  {failureNote(mandatoryFailure.get())}
                </p>
              )}
            </>
          )}
        </div>
        <div aria-live="polite" role="status" className="sr-only">
          {announce}
        </div>
        {s.phase !== 'installing' && (
          <div className="mt-[26px] flex w-full justify-center gap-3 phone:flex-col-reverse">
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
            {s.phase === 'countdown' && (
              <button
                type="button"
                data-update-now
                onClick={() => flow()?.startNow()}
                className={primaryBtn}
              >
                {t('update.v2.updateNow')}
              </button>
            )}
            {/* A failure never keeps the person out of the app. Not when
                another tab upgraded the notes (U11: no database). */}
            {canLeave && (
              <button
                type="button"
                data-update-dismiss
                onClick={() => flow()?.dismiss()}
                className={tonalBtn}
              >
                {t('update.v2.notNow')}
              </button>
            )}
            {(s.phase === 'paused' || s.phase === 'failed') && (
              <button
                ref={primary}
                type="button"
                onClick={() => flow()?.retry()}
                className={primaryBtn}
              >
                {s.phase === 'failed' && (
                  <RefreshCw aria-hidden="true" size={18} strokeWidth={1.6} />
                )}
                {s.phase === 'paused'
                  ? t('update.v2.updateNow')
                  : t('update.v2.tryAgain')}
              </button>
            )}
          </div>
        )}
        {s.phase === 'failed' && <FailedLinks s={s} canLeave={canLeave} />}
      </div>
    </div>
  )
}
