import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n/t'
import { countUnsent, signIn, startFreshOnThisDevice } from './syncService'

const primary =
  'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50'
const quiet =
  'min-h-11 rounded-lg border border-line px-4 text-sm hover:bg-hover disabled:opacity-50'

/**
 * Remote sign-out: a full-screen glass lock. The notes are hidden, not erased
 * (a modal dialog with a solid backdrop: nothing behind it can be read or
 * used). Only "Sign in" and "Start fresh on this device" work.
 */
export function SignedOutLock() {
  const ref = useRef<HTMLDialogElement>(null)
  const [fresh, setFresh] = useState<{ unsent: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => d?.close()
  }, [])

  const openFresh = async () => {
    setError(false)
    setFresh({ unsent: await countUnsent().catch(() => 0) })
  }
  const go = async () => {
    setBusy(true)
    setError(false)
    try {
      await startFreshOnThisDevice() // reloads into the empty app
    } catch {
      setError(true)
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={ref}
      data-testid="signed-out-lock"
      aria-labelledby="so-title"
      aria-describedby="so-text"
      onCancel={(e) => e.preventDefault()}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-4 text-ink backdrop:bg-[var(--color-canvas)] open:grid open:place-items-center"
    >
      <div className="glass w-[min(26rem,100%)] rounded-2xl p-6 text-center">
        <span aria-hidden className="text-4xl">
          🔒
        </span>
        {!fresh ? (
          <>
            <h1 id="so-title" className="mt-2 text-xl font-semibold">
              {t('sync.ended.title')}
            </h1>
            <p id="so-text" className="mt-2 text-sm leading-relaxed text-muted">
              {t('sync.ended.text')}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                className={primary}
                disabled={busy}
                autoFocus
                onClick={() => {
                  setBusy(true)
                  void signIn().finally(() => setBusy(false))
                }}
              >
                {t('sync.ended.signIn')}
              </button>
              <button
                type="button"
                className={quiet}
                disabled={busy}
                onClick={() => void openFresh()}
              >
                {t('sync.ended.fresh')}
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 id="so-title" className="mt-2 text-xl font-semibold">
              {t('sync.fresh.title')}
            </h1>
            <div
              id="so-text"
              className="mt-2 space-y-2 text-sm leading-relaxed text-muted"
            >
              <p>{t('sync.fresh.text')}</p>
              <p
                data-testid="fresh-unsent"
                className={fresh.unsent > 0 ? 'font-medium text-danger' : ''}
              >
                {fresh.unsent > 0
                  ? t('sync.fresh.unsent', { count: fresh.unsent })
                  : t('sync.fresh.none')}
              </p>
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm text-danger">
                {t('sync.fresh.error')}
              </p>
            )}
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                className="min-h-11 rounded-lg bg-danger px-4 text-sm font-semibold text-white disabled:opacity-50"
                disabled={busy}
                onClick={() => void go()}
              >
                {busy ? t('sync.fresh.working') : t('sync.fresh.go')}
              </button>
              <button
                type="button"
                className={quiet}
                disabled={busy}
                autoFocus
                onClick={() => setFresh(null)}
              >
                {t('sync.fresh.back')}
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  )
}
