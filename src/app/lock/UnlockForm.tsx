import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { LearningNotesDB } from '../../core/db'
import { getLockConfig, type LockMethods } from '../../core/lock/lockConfig'
import { verifySecret } from '../../core/lock/lockCrypto'
import {
  noteFailure,
  noteSuccess,
  waitSeconds,
} from '../../core/lock/lockState'
import { verifyWithPasskey } from '../../core/lock/webauthn'
import { t } from '../../i18n/t'

/**
 * Asks for a way to unlock: the device lock (Face ID, Touch ID, Windows
 * Hello), the PIN or the password. A wrong code never says which part was
 * wrong, and five wrong tries in a row make a wait that doubles each time.
 * If the device lock fails or is cancelled, the PIN or password still works.
 */
export function UnlockForm({
  db,
  methods,
  onUnlocked,
  onForgot,
  autoFocus = true,
}: {
  db: LearningNotesDB
  methods: LockMethods
  onUnlocked: () => void
  onForgot?: () => void
  autoFocus?: boolean
}) {
  const [mode, setMode] = useState<'pin' | 'password'>(
    methods.pin ? 'pin' : 'password',
  )
  const [value, setValue] = useState('')
  const [error, setError] = useState<'wrong' | 'device' | null>(null)
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(waitSeconds())
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && (methods.pin || methods.password)) input.current?.focus()
  }, [autoFocus, methods.pin, methods.password, mode])

  // Count a wait down.
  useEffect(() => {
    if (wait <= 0) return
    const timer = setInterval(() => setWait(waitSeconds()), 500)
    return () => clearInterval(timer)
  }, [wait])

  const succeed = () => {
    noteSuccess()
    setValue('')
    onUnlocked()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || wait > 0 || value === '') return
    setBusy(true)
    try {
      const config = await getLockConfig(db)
      const stored = mode === 'pin' ? config.pin : config.password
      if (stored && (await verifySecret(value, stored))) {
        succeed()
        return
      }
      noteFailure()
      setWait(waitSeconds())
      setError('wrong')
      setValue('')
    } finally {
      setBusy(false)
    }
  }

  const device = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await verifyWithPasskey()
      if (result === 'ok') succeed()
      else setError('device')
    } finally {
      setBusy(false)
    }
  }

  const hasCode = methods.pin || methods.password
  return (
    <div className="flex w-full max-w-[320px] flex-col gap-3">
      {methods.passkey && (
        <button
          type="button"
          onClick={device}
          disabled={busy}
          data-testid="unlock-device"
          className="min-h-12 rounded-xl bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {t('lock.unlock.device')}
        </button>
      )}
      {hasCode && (
        <form onSubmit={submit} className="flex flex-col gap-2">
          {methods.pin && methods.password && (
            <div
              role="radiogroup"
              aria-label={t('lock.unlock.with')}
              className="flex gap-1.5"
            >
              {(['pin', 'password'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => {
                    setMode(m)
                    setValue('')
                    setError(null)
                  }}
                  className={`min-h-11 flex-1 rounded-lg border text-sm ${
                    mode === m
                      ? 'border-accent font-semibold text-accent'
                      : 'border-line hover:bg-hover'
                  }`}
                >
                  {t(m === 'pin' ? 'lock.pin' : 'lock.password')}
                </button>
              ))}
            </div>
          )}
          <label className="text-sm" htmlFor="unlock-code">
            {t(mode === 'pin' ? 'lock.enterPin' : 'lock.enterPassword')}
          </label>
          <input
            id="unlock-code"
            ref={input}
            type="password"
            value={value}
            onChange={(e) => {
              setValue(
                mode === 'pin'
                  ? e.target.value.replace(/\D/g, '')
                  : e.target.value,
              )
              setError(null)
            }}
            inputMode={mode === 'pin' ? 'numeric' : 'text'}
            pattern={mode === 'pin' ? '[0-9]*' : undefined}
            maxLength={mode === 'pin' ? 6 : 128}
            autoComplete="off"
            aria-invalid={error === 'wrong'}
            aria-describedby={error || wait > 0 ? 'unlock-error' : undefined}
            className="min-h-12 rounded-xl border border-line bg-bg px-3 text-center text-lg tracking-widest outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy || wait > 0 || value === ''}
            className="min-h-12 rounded-xl border border-line px-4 text-sm font-medium hover:bg-hover disabled:opacity-50"
          >
            {t('lock.unlock')}
          </button>
        </form>
      )}
      <div
        id="unlock-error"
        role="alert"
        className="min-h-5 text-center text-sm text-danger"
      >
        {wait > 0
          ? t('lock.wait', { seconds: wait })
          : error === 'wrong'
            ? t('lock.wrong')
            : error === 'device'
              ? t('lock.deviceFailed')
              : ''}
      </div>
      {onForgot && (
        <button
          type="button"
          onClick={onForgot}
          className="min-h-11 text-sm text-accent underline underline-offset-2"
        >
          {t('lock.forgot')}
        </button>
      )}
    </div>
  )
}
