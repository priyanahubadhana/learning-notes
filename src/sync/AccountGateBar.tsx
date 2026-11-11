import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { onboardingGuide } from '../app/signInGuideState'
import { t } from '../i18n/t'
import { SignInPanel } from './SignInPanel'

/**
 * The calm, full-width bar and the sign-in sheet of the account gate (Q3a).
 * The bar sits at the top and pushes the page down; it cannot be dismissed
 * (the device stays read-only until the person signs in) but it never covers
 * a note. The sheet reuses the sign-in panel (Google, email code, email +
 * password); Google and email hand over to the same guided sign-in as the
 * first-run welcome (passphrase, recovery code). Offline, the sheet says so
 * instead of offering a sign-in that cannot work.
 */
export function AccountGateBar({
  sheet,
  onOpen,
  onClose,
}: {
  sheet: boolean
  onOpen: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--attn-h', '44px')
    return () => {
      root.style.removeProperty('--attn-h')
    }
  }, [])
  return (
    <>
      <div
        role="status"
        aria-live="polite"
        data-chrome
        data-testid="account-gate-bar"
        className="fixed inset-x-0 top-0 z-40 flex min-h-11 items-center justify-center gap-2 border-b border-line bg-hover px-4 pt-[env(safe-area-inset-top)] text-[13px] text-ink"
      >
        <span>{t('gate.banner')}</span>
        <button
          type="button"
          data-testid="account-gate-signin"
          onClick={onOpen}
          className="min-h-9 rounded-md px-2.5 font-semibold text-accent underline underline-offset-2 hover:bg-accent/10"
        >
          {t('gate.signIn')}
        </button>
      </div>
      {sheet && <GateSheet onClose={onClose} />}
    </>
  )
}

function GateSheet({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
      d?.close()
    }
  }, [])

  /** The guided sign-in (Google redirect, passphrase, recovery code) takes over. */
  const handOver = () => {
    onboardingGuide.set(true)
    onClose()
  }

  return createPortal(
    <dialog
      ref={ref}
      data-testid="account-gate-sheet"
      data-palm-guard
      aria-labelledby="ag-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface-3 p-5 text-ink shadow-[var(--elev-3)] backdrop:bg-[var(--scrim)]"
    >
      <h2 id="ag-title" className="text-lg font-semibold">
        {t('gate.sheet.title')}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">{t('gate.sheet.help')}</p>
      {online ? (
        <div className="mt-3 grid gap-2">
          <SignInPanel onGoogle={handOver} onDone={handOver} />
        </div>
      ) : (
        <p
          role="status"
          data-testid="account-gate-offline"
          className="mt-3 rounded-lg bg-soft px-3 py-2 text-sm"
        >
          {t('gate.sheet.offline')}
        </p>
      )}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg border border-line px-4 text-sm font-medium hover:bg-hover"
        >
          {t('gate.sheet.later')}
        </button>
      </div>
    </dialog>,
    document.body,
  )
}
