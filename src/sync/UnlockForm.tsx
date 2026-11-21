import { useEffect, useId, useRef, useState } from 'react'
import { t } from '../i18n/t'
import {
  clock,
  codeLengthSlip,
  fingerprint,
  unlockLimiter,
  cleanCode,
  type SecretKind,
} from './unlockAttempts'
import { AreaInput } from '../settings/AreaInput'

/**
 * The one box for typing the passphrase or the recovery code (fix #3): Settings
 * › Sync, the first-run sign-in guide and "Make a new recovery code" all use it
 * (the "locked notebooks" pop-up leads to the Settings one). A wrong try keeps
 * and selects the text, shows a red line with an icon, and after three tries
 * waits 1 min, 5, 15, then 1 h (never permanent). Only a real mismatch shows
 * the error: a slow correct entry shows "Checking…" instead.
 */

const field =
  'min-h-11 w-full rounded-lg border bg-bg px-3 text-sm outline-none focus:border-accent disabled:opacity-50'
const primary =
  'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50'
const link = 'min-h-11 self-start text-sm text-accent underline'

/** 'ok' unlocked; 'wrong' counts as a try; 'error' is a failure that is not the person's (no count). */
export type TryResult = 'ok' | 'wrong' | 'error'

export function UnlockForm({
  kinds,
  submit,
  submitLabel,
  title,
  help,
  testId,
  extra,
}: {
  /** Which secrets this box takes (the first is shown first). */
  kinds: SecretKind[]
  submit: (secret: string, kind: SecretKind) => Promise<TryResult>
  submitLabel: string
  title: string
  help: string
  testId?: string
  extra?: React.ReactNode
}) {
  const [kind, setKind] = useState<SecretKind>(kinds[0])
  const [value, setValue] = useState('')
  const [shown, setShown] = useState(false)
  const [caps, setCaps] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<'wrong' | 'length' | null>(null)
  const [slip, setSlip] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const id = useId()
  const errId = `${id}-err`
  const waitId = `${id}-wait`

  // `tick` only makes the countdown redraw each second; the clock is read fresh.
  const [, setTick] = useState(0)
  const left = unlockLimiter.remaining(kind)
  const remaining = left
  const locked = left > 0
  useEffect(() => {
    if (!locked) return
    const timer = window.setInterval(() => setTick((x) => x + 1), 1000)
    return () => window.clearInterval(timer)
  }, [locked])

  // After a wrong try: focus the box with the text selected.
  const [selectTick, setSelectTick] = useState(0)
  useEffect(() => {
    if (selectTick === 0) return
    input.current?.focus()
    input.current?.select()
  }, [selectTick])

  const switchTo = (k: SecretKind) => {
    setKind(k)
    setValue('')
    setError(null)
    setShown(false)
  }

  const go = async () => {
    if (busy || remaining > 0 || !value) return
    if (kind === 'code') {
      const n = codeLengthSlip(value)
      if (n !== null) {
        // A wrong length is a slip, not a try.
        setSlip(n)
        setError('length')
        setSelectTick((x) => x + 1)
        return
      }
    }
    setBusy(true)
    setError(null)
    const secret = kind === 'code' ? cleanCode(value) : value
    try {
      const result = await submit(secret, kind)
      if (result === 'ok') {
        unlockLimiter.succeed()
      } else if (result === 'wrong') {
        unlockLimiter.fail(kind, await fingerprint(secret))
        setError('wrong')
        setSelectTick((x) => x + 1)
      }
    } finally {
      setBusy(false)
    }
  }

  const checking =
    kind === 'code' ? t('unlock.checkingCode') : t('unlock.checkingPassphrase')
  const message =
    error === 'wrong'
      ? kind === 'code'
        ? t('unlock.wrongCode')
        : t('unlock.wrongPassphrase')
      : error === 'length'
        ? t('unlock.codeLength', { count: slip })
        : null
  const describedBy =
    [message ? errId : '', locked ? waitId : ''].filter(Boolean).join(' ') ||
    undefined
  const other = kinds.find((k) => k !== kind)

  return (
    <form
      className="flex flex-col gap-3"
      data-testid={testId}
      onSubmit={(e) => {
        e.preventDefault()
        void go()
      }}
    >
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-sm text-muted">{help}</p>
      <div className="flex flex-col gap-1 text-sm">
        <label htmlFor={`${id}-in`}>
          {kind === 'code' ? t('unlock.codeLabel') : t('sync.passphrase')}
        </label>
        <div className="flex gap-2">
          <AreaInput
            id={`${id}-in`}
            ref={input}
            type={kind === 'passphrase' && !shown ? 'password' : 'text'}
            autoComplete={kind === 'passphrase' ? 'current-password' : 'off'}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={`${field} ${error ? 'border-danger' : 'border-line'}`}
            value={value}
            disabled={locked}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            onChange={(e) => {
              setValue(e.target.value)
              if (error === 'length') setError(null)
            }}
            onKeyDown={(e) => setCaps(e.getModifierState('CapsLock'))}
            onKeyUp={(e) => setCaps(e.getModifierState('CapsLock'))}
            onBlur={() => setCaps(false)}
          />
          {kind === 'passphrase' && (
            <button
              type="button"
              className="min-h-11 min-w-11 rounded-lg border border-line text-lg hover:bg-hover"
              aria-pressed={shown}
              aria-label={shown ? t('unlock.hide') : t('unlock.show')}
              onClick={() => setShown((s) => !s)}
            >
              <Eye off={shown} />
            </button>
          )}
        </div>
      </div>
      {caps && kind === 'passphrase' && (
        <p className="text-xs text-muted" data-testid="caps-hint">
          {t('unlock.caps')}
        </p>
      )}
      {message && (
        <p
          id={errId}
          role="alert"
          className="flex items-start gap-1.5 text-sm text-danger"
          data-testid="unlock-error"
        >
          <Warn />
          <span>{message}</span>
        </p>
      )}
      {locked && (
        <>
          <p
            id={waitId}
            className="flex items-start gap-1.5 text-sm text-danger"
            data-testid="unlock-wait"
          >
            <Warn />
            <span>{t('unlock.wait', { time: clock(left) })}</span>
          </p>
          <p className="sr-only" aria-live="polite">
            {t('unlock.waitSr', { count: Math.ceil(left / 60_000) })}
          </p>
        </>
      )}
      {busy && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-muted"
          data-testid="unlock-checking"
        >
          <Spinner />
          <span>
            {checking} {t('unlock.checkingSlow')}
          </span>
        </p>
      )}
      <div>
        <button
          type="submit"
          className={primary}
          disabled={busy || locked || !value}
        >
          {busy ? t('sync.working') : submitLabel}
        </button>
      </div>
      {other && (
        <button
          type="button"
          className={link}
          data-testid="unlock-switch"
          onClick={() => switchTo(other)}
        >
          {other === 'code' ? t('unlock.useCode') : t('unlock.usePassphrase')}
        </button>
      )}
      {extra}
    </form>
  )
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none"
    />
  )
}

function Warn() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="mt-0.5 size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="10" cy="10" r="8" />
      <path d="M10 6v5M10 14h.01" />
    </svg>
  )
}

function Eye({ off }: { off: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="mx-auto size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10Z" />
      <circle cx="10" cy="10" r="2.5" />
      {off && <path d="M3 3l14 14" />}
    </svg>
  )
}

/** After Unlock: "Bringing your notebooks…" with a bar, then "All set". Never looks like an error. */
export function ArrivalNotice({
  arrival,
  onDone,
}: {
  arrival: { done: number; finished: boolean }
  onDone: () => void
}) {
  useEffect(() => {
    if (!arrival.finished) return
    const timer = window.setTimeout(onDone, 2500)
    return () => window.clearTimeout(timer)
  }, [arrival.finished, onDone])
  return (
    <div
      role="status"
      className="flex flex-col gap-2 text-sm"
      data-testid="unlock-arrival"
    >
      {arrival.finished ? (
        <p>{t('unlock.allSet')}</p>
      ) : (
        <>
          <p className="flex items-center gap-2">
            <Spinner />
            <span>
              {arrival.done > 0
                ? t('unlock.bringingCount', { count: arrival.done })
                : t('unlock.bringing')}
            </span>
          </p>
          <div
            aria-hidden="true"
            className="h-1.5 overflow-hidden rounded-full bg-line"
          >
            <div className="h-full w-1/3 animate-pulse rounded-full bg-accent motion-reduce:animate-none" />
          </div>
        </>
      )}
    </div>
  )
}
