import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n/t'
import { getAppActions } from '../app/tools/toolRuntime'

const SHOWN = 'attn.locked.shown'
const IDLE_MS = 2000

function shownBefore(): boolean {
  try {
    return sessionStorage.getItem(SHOWN) === '1'
  } catch {
    return false
  }
}

function markShown() {
  try {
    sessionStorage.setItem(SHOWN, '1')
  } catch {
    // Storage blocked: the pop-up may show again after a reload.
  }
}

const typingIn = (el: Element | null) =>
  !!el &&
  (el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el as HTMLElement).isContentEditable)

const onSyncPage = () => location.hash.startsWith('#/settings/sync')

function openUnlock() {
  if (getAppActions()) getAppActions()?.openSettings('account/account.syncNow')
  else location.hash = '#/settings/sync'
}

/**
 * Level 1: one pop-up per session when the synced notebooks are locked on
 * this device; "Later" leaves a bright banner until unlocked. Never opens
 * while the person is typing.
 */
export function LockedAlert() {
  const [phase, setPhase] = useState<'wait' | 'modal' | 'banner'>(
    shownBefore() ? 'banner' : 'wait',
  )
  useEffect(() => {
    if (phase !== 'wait') return
    let lastKey = 0
    const onKey = () => (lastKey = Date.now())
    window.addEventListener('keydown', onKey, true)
    const timer = window.setInterval(() => {
      const typing =
        typingIn(document.activeElement) && Date.now() - lastKey < IDLE_MS
      // Never over the unlock form itself.
      if (typing || onSyncPage()) return
      markShown()
      setPhase('modal')
    }, 500)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.clearInterval(timer)
    }
  }, [phase])

  if (phase === 'modal') {
    return <LockedModal onClose={() => setPhase('banner')} />
  }
  if (phase === 'banner') return <LockedBanner />
  return null
}

function LockedModal({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  const opener = useRef<Element | null>(document.activeElement)
  useEffect(() => {
    ref.current?.showModal() // the browser traps focus inside
    primary.current?.focus()
    const back = opener.current
    return () => {
      if (back instanceof HTMLElement && back.isConnected) back.focus()
    }
  }, [])
  const go = () => {
    onClose()
    openUnlock()
  }
  const button = 'min-h-11 rounded-lg px-4 py-2 text-sm'
  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby="locked-title"
      aria-describedby="locked-text"
      data-testid="locked-modal"
      onCancel={onClose}
      className="m-auto w-[min(27rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface-3 p-5 text-ink shadow-[var(--elev-3)] backdrop:bg-[var(--scrim)]"
    >
      <h2 id="locked-title" className="mb-1.5 text-[15px] font-semibold">
        {t('attention.locked.title')}
      </h2>
      <p id="locked-text" className="mb-5 text-sm leading-relaxed text-muted">
        {t('attention.locked.text')}
      </p>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className={`${button} border border-line hover:bg-hover`}
        >
          {t('attention.locked.later')}
        </button>
        <button
          type="button"
          onClick={go}
          className={`${button} border border-line hover:bg-hover`}
        >
          {t('attention.locked.code')}
        </button>
        <button
          type="button"
          ref={primary}
          onClick={go}
          className={`${button} bg-accent font-medium text-white hover:opacity-90`}
        >
          {t('attention.locked.enter')}
        </button>
      </div>
    </dialog>
  )
}

function LockedBanner() {
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--attn-h', '44px')
    return () => {
      root.style.removeProperty('--attn-h')
    }
  }, [])
  return (
    <div
      role="status"
      aria-live="polite"
      data-chrome
      data-testid="locked-banner"
      className="fixed inset-x-0 top-0 z-50 flex h-11 items-center justify-center gap-3 bg-danger px-4 text-[13px] font-medium text-white"
    >
      <span>{t('attention.locked.banner')} ·</span>
      <button
        type="button"
        onClick={openUnlock}
        className="min-h-9 rounded-md px-2.5 font-semibold underline underline-offset-2 hover:bg-white/15"
      >
        {t('attention.locked.unlock')}
      </button>
    </div>
  )
}
