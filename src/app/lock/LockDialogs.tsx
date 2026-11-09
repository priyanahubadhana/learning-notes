import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { LearningNotesDB } from '../../core/db'
import type { LockMethods } from '../../core/lock/lockConfig'
import { listLocked, removeAllLocks } from '../../core/lock/lockService'
import { relockAll, unlock } from '../../core/lock/lockState'
import {
  passkeyMessageKey,
  verifyWithPasskey,
  type PasskeyResult,
} from '../../core/lock/webauthn'
import { t } from '../../i18n/t'
import { PopupClose } from '../tools/PopupClose'
import { UnlockForm } from './UnlockForm'

/** A modal box for the lock screens (Esc and ✕ close it). */
export function LockDialog({
  title,
  onClose,
  children,
  testId,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  testId?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      data-testid={testId}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-auto w-[min(380px,calc(100vw-24px))] rounded-2xl border border-line bg-surface-3 p-4 text-ink shadow-[var(--elev-3)] backdrop:bg-[var(--scrim)]"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        <PopupClose onClose={onClose} />
      </div>
      {children}
    </dialog>
  )
}

/**
 * "Forgot my code". The honest answer: this is a privacy lock, not
 * encryption, so nothing is lost and the lock can be cleared.
 * - With a device lock set up on this device (Face ID, Touch ID, Windows
 *   Hello): verifying with it opens the thing at once, and then the codes
 *   can be changed in Settings › Lock. Clearing the whole lock also needs
 *   it.
 * - Without one: the lock can be cleared after a plain warning and a tick.
 */
export function ForgotDialog({
  db,
  methods,
  rootId,
  onClose,
  onDone,
}: {
  db: LearningNotesDB
  methods: LockMethods
  /** What to open when the device lock confirms (the locked thing). */
  rootId?: string
  onClose: () => void
  onDone: (what: 'unlocked' | 'removed') => void
}) {
  const [ack, setAck] = useState(false)
  const [error, setError] = useState(false)
  const [failure, setFailure] = useState<PasskeyResult | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    void listLocked(db).then((l) =>
      setCount(l.pages.length + l.notebooks.length + l.databases.length),
    )
  }, [db])

  const viaDevice = async () => {
    setBusy(true)
    setError(false)
    const result = await verifyWithPasskey()
    setBusy(false)
    if (result !== 'ok') {
      setFailure(result)
      setError(true)
      return
    }
    if (rootId) unlock(rootId)
    onDone('unlocked')
  }
  const remove = async () => {
    if (methods.passkey) {
      setBusy(true)
      const result = await verifyWithPasskey()
      setBusy(false)
      if (result !== 'ok') {
        setFailure(result)
        setError(true)
        return
      }
    }
    await removeAllLocks(db)
    relockAll()
    onDone('removed')
  }

  return (
    <LockDialog
      title={t('lock.forgot.title')}
      onClose={onClose}
      testId="forgot-dialog"
    >
      <p className="mb-3 text-sm leading-relaxed">{t('lock.forgot.what')}</p>
      {methods.passkey && (
        <div className="mb-3 border-t border-line pt-3">
          <p className="mb-2 text-sm">{t('lock.forgot.device')}</p>
          <button
            type="button"
            disabled={busy}
            onClick={viaDevice}
            className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {t('lock.unlock.device')}
          </button>
        </div>
      )}
      <div className="border-t border-line pt-3">
        <p className="mb-2 text-sm">
          {methods.passkey
            ? t('lock.forgot.removeDevice')
            : t('lock.forgot.removePlain')}
        </p>
        <p className="mb-2 text-sm text-muted">
          {t('lock.forgot.count', { count: count ?? 0 })}
        </p>
        <label className="mb-3 flex min-h-11 items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-1 size-5"
          />
          <span>{t('lock.forgot.ack')}</span>
        </label>
        <button
          type="button"
          disabled={!ack || busy}
          onClick={remove}
          className="min-h-11 rounded-lg border border-line px-4 text-sm font-medium text-danger hover:bg-hover disabled:opacity-40"
        >
          {t('lock.forgot.remove')}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t(passkeyMessageKey(failure))}
        </p>
      )}
    </LockDialog>
  )
}

/** Asks for the current code before a change in Settings › Lock. */
export function AuthDialog({
  db,
  methods,
  onDone,
  onCancel,
}: {
  db: LearningNotesDB
  methods: LockMethods
  onDone: () => void
  onCancel: () => void
}) {
  const [forgot, setForgot] = useState(false)
  return (
    <>
      <LockDialog
        title={t('lock.auth.title')}
        onClose={onCancel}
        testId="auth-dialog"
      >
        <p className="mb-3 text-sm text-muted">{t('lock.auth.text')}</p>
        <div className="flex justify-center">
          <UnlockForm
            db={db}
            methods={methods}
            onUnlocked={onDone}
            onForgot={() => setForgot(true)}
          />
        </div>
      </LockDialog>
      {forgot && (
        <ForgotDialog
          db={db}
          methods={methods}
          onClose={() => setForgot(false)}
          onDone={() => {
            setForgot(false)
            onDone()
          }}
        />
      )}
    </>
  )
}
