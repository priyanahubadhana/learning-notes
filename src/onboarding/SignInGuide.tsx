import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import { RecoveryCodeView } from '../sync/RecoveryCodeView'
import { SetUp, Unlock } from '../sync/SyncSection'
import {
  getSyncStatus,
  setUpKey,
  signIn,
  startSync,
  subscribeSync,
} from '../sync/syncService'
import { onboardingGuide } from './onboardingState'

/**
 * Fix #1 A: after "Sign in with Google" the first-run guide takes over the
 * whole screen, one step at a time (instead of sending the person to
 * Settings): new account → choose a passphrase → save the recovery code;
 * existing account → type the passphrase or recovery code. "Not now" leaves
 * the app usable; sync can be finished later in Settings › Sync. Lazy-loaded.
 */

const TRIED = 'learning-notes:onboarding.signInTried'
const button =
  'min-h-11 rounded-lg border border-line px-4 text-sm font-medium hover:bg-hover'
const primary =
  'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white'

const tried = (set?: boolean): boolean => {
  try {
    if (set === true) sessionStorage.setItem(TRIED, '1')
    if (set === false) sessionStorage.removeItem(TRIED)
    return sessionStorage.getItem(TRIED) === '1'
  } catch {
    return false
  }
}

export function SignInGuide({ db }: { db: LearningNotesDB }) {
  const ref = useRef<HTMLDialogElement>(null)
  const status = useSyncExternalStore(subscribeSync, getSyncStatus)
  const [booted, setBooted] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  /** The key was made in this guide: the code screen decides when it ends. */
  const settingUp = useRef(false)

  const close = () => onboardingGuide.set(false)
  const start = async () => {
    setOffline(false)
    tried(true)
    try {
      await signIn() // the real one leaves the page for Google
    } catch {
      setOffline(true)
    }
  }

  useEffect(() => {
    ref.current?.showModal()
    void startSync(db).then(async () => {
      setBooted(true)
      if (getSyncStatus().phase === 'signedOut' && !tried()) await start()
    })
  }, [db])

  // Already unlocked (or finished elsewhere): nothing to guide.
  const open = status.phase === 'ready' || status.phase === 'syncing'
  useEffect(() => {
    if (booted && open && !settingUp.current && !code) close()
  }, [booted, open, code])

  const Local = (
    <button
      type="button"
      className={button}
      data-testid="guide-local"
      onClick={close}
    >
      {t('welcome.account.local')}
    </button>
  )

  let body
  if (code) {
    body = (
      <>
        <h2 className="text-xl font-semibold">{t('guide.code.title')}</h2>
        <RecoveryCodeView
          big
          code={code}
          onDone={() => {
            settingUp.current = false
            setCode(null)
            close()
          }}
        />
      </>
    )
  } else if (!booted || (status.phase === 'signedOut' && !tried())) {
    body = <p className="text-sm text-muted">{t('guide.connecting')}</p>
  } else if (status.phase === 'signedOut') {
    body = (
      <>
        <h2 className="text-xl font-semibold">{t('guide.signedOut.title')}</h2>
        <p className="text-sm text-ink-soft">
          {offline
            ? t('welcome.account.offline')
            : status.problem
              ? t(`sync.${status.problem}`)
              : t('guide.signedOut.help')}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primary}
            onClick={() => void start()}
          >
            {t('guide.tryAgain')}
          </button>
          {Local}
        </div>
      </>
    )
  } else if (status.phase === 'needsSetup') {
    body = (
      <>
        <h2 className="text-xl font-semibold">{t('guide.passphrase.title')}</h2>
        <SetUp
          onMade={async (p) => {
            settingUp.current = true
            setCode((await setUpKey(db, p)).recoveryCode)
          }}
        />
        <div>
          <button type="button" className={button} onClick={close}>
            {t('guide.notNow')}
          </button>
        </div>
      </>
    )
  } else if (open) {
    body = <p className="text-sm text-muted">{t('guide.connecting')}</p>
  } else {
    body = (
      <>
        <h2 className="text-xl font-semibold">{t('guide.unlock.title')}</h2>
        <p className="text-sm text-ink-soft">
          {t('sync.signedInAs', { email: status.email ?? '' })}
        </p>
        <Unlock db={db} />
        <div>
          <button type="button" className={button} onClick={close}>
            {t('guide.notNow')}
          </button>
        </div>
      </>
    )
  }

  return createPortal(
    <dialog
      ref={ref}
      data-testid="signin-guide"
      data-palm-guard
      aria-label={t('welcome.account.title')}
      onCancel={(e) => e.preventDefault()}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-bg p-0 text-ink backdrop:bg-bg"
    >
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-4 px-4 py-10">
        {body}
      </div>
    </dialog>,
    document.body,
  )
}
