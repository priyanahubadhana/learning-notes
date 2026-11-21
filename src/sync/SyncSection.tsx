import { useEffect, useState, useSyncExternalStore } from 'react'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import { passphraseProblem } from './crypto'
import { checkDevice } from './deviceCheck'
import { SyncDot } from './SyncDot'
import { DriveConnectCard } from './DriveConnectCard'
import { useGoogleLinked } from './useGoogleLinked'
import { ArrivalNotice, UnlockForm } from './UnlockForm'
import { RecoveryCodeView } from './RecoveryCodeView'
import { WhatSyncs } from '../settings/WhatSyncs'
import {
  dismissArrival,
  dismissMerged,
  getSyncStatus,
  reconnectDrive,
  setUpKey,
  startSync,
  subscribeSync,
  unlock,
} from './syncService'
import { SettingsLink } from '../settings/SettingsLink'
import { AreaInput } from '../settings/AreaInput'

const field =
  'min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent'
const button =
  'min-h-11 rounded-lg border border-line px-4 text-sm font-medium hover:bg-hover disabled:opacity-50'
const primary =
  'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50'

const when = (ms: number) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(ms)

/**
 * Settings › Sync (L4, L5): sign in, choose the passphrase and save the
 * printed recovery code (first device), or unlock (other devices); then
 * status and Reconnect Drive. Sign in, sign out, Sync now, Drive's lasting
 * connection and the new recovery code live in Settings › Account
 * (AccountSection). Signing in or out never touches the notes.
 */
export function SyncSection({ db }: { db: LearningNotesDB }) {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus)
  const [code, setCode] = useState<string | null>(null)
  useEffect(() => {
    void startSync(db)
  }, [db])

  return (
    <section data-testid="sync-section" className="mb-6 flex flex-col gap-4">
      <h2 className="text-base font-semibold">{t('sync.title')}</h2>
      <p className="text-sm text-muted">{t('sync.intro')}</p>
      {status.problem && (
        <p role="alert" className="text-sm text-danger">
          {t(`sync.${status.problem}`)}
        </p>
      )}

      {code ? (
        <RecoveryCodeView code={code} onDone={() => setCode(null)} />
      ) : status.phase === 'signedOut' ? (
        <p className="text-sm">
          <SettingsLink to="account/account.signIn">
            {t('account.signInIn')}
          </SettingsLink>
        </p>
      ) : (
        <>
          <p className="text-sm">
            {t('sync.signedInAs', { email: status.email ?? '' })}{' '}
            <SettingsLink to="category:account">
              {t('account.manage')}
            </SettingsLink>
          </p>
          {status.phase === 'needsSetup' && (
            <SetUp
              onMade={async (p) =>
                setCode((await setUpKey(db, p)).recoveryCode)
              }
            />
          )}
          {(status.phase === 'needsKey' ||
            status.problem === 'needCode' ||
            status.problem === 'unreadable') && <Unlock db={db} />}
          {(status.phase === 'ready' || status.phase === 'syncing') && (
            <Running db={db} />
          )}
        </>
      )}
      <WhatSyncs db={db} signedIn={status.phase !== 'signedOut'} />
      <p className="text-xs text-muted">{t('sync.privacy')}</p>
      <DeviceCheck />
    </section>
  )
}

export function SetUp({ onMade }: { onMade: (p: string) => Promise<void> }) {
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [busy, setBusy] = useState(false)
  const problem = passphraseProblem(p1)
  const error =
    p1 && problem === 'short'
      ? t('sync.tooShort')
      : p1 && problem === 'simple'
        ? t('sync.tooSimple')
        : p2 && p1 !== p2
          ? t('sync.noMatch')
          : null
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (problem || p1 !== p2) return
        setBusy(true)
        void onMade(p1).finally(() => setBusy(false))
      }}
    >
      <h3 className="text-sm font-semibold">{t('sync.setupTitle')}</h3>
      <p className="text-sm text-muted">{t('sync.setupHelp')}</p>
      <label className="flex flex-col gap-1 text-sm">
        {t('sync.passphrase')}
        <AreaInput
          type="password"
          autoComplete="new-password"
          className={field}
          value={p1}
          onChange={(e) => setP1(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t('sync.passphraseAgain')}
        <AreaInput
          type="password"
          autoComplete="new-password"
          className={field}
          value={p2}
          onChange={(e) => setP2(e.target.value)}
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div>
        <button
          type="submit"
          className={primary}
          disabled={busy || !!problem || p1 !== p2}
        >
          {busy ? t('sync.working') : t('sync.create')}
        </button>
      </div>
    </form>
  )
}

export function Unlock({ db }: { db: LearningNotesDB }) {
  return (
    <UnlockForm
      kinds={['passphrase', 'code']}
      title={t('sync.unlockTitle')}
      help={t('sync.unlockHelp')}
      submitLabel={t('sync.unlock')}
      submit={async (secret) => ((await unlock(db, secret)) ? 'ok' : 'wrong')}
    />
  )
}

/** After Unlock: progress of the first download, then "All set". */
export function Arrival() {
  const { arrival } = useSyncExternalStore(subscribeSync, getSyncStatus)
  if (!arrival) return null
  return <ArrivalNotice arrival={arrival} onDone={dismissArrival} />
}

function Running({ db }: { db: LearningNotesDB }) {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus)
  const { linked, refresh: refreshGoogle } = useGoogleLinked()
  const noGoogle = linked === false
  return (
    <div className="flex flex-col gap-3">
      <Arrival />
      <SyncDot className="text-sm" />
      <p className="text-sm" data-testid="sync-status" aria-live="polite">
        {status.phase === 'syncing'
          ? t('sync.syncing')
          : status.lastSyncedAt
            ? t('sync.last', { time: when(status.lastSyncedAt) })
            : t('sync.never')}
      </p>
      <p className="text-xs text-muted" data-testid="sync-live">
        {status.live ? t('sync.live') : t('sync.notLive')}
      </p>
      {!!status.mergedPages && (
        <p className="text-sm">
          {t('sync.merged', { count: status.mergedPages })}{' '}
          <button type="button" className="underline" onClick={dismissMerged}>
            {t('sync.ok')}
          </button>
        </p>
      )}
      {status.needsDriveTap && noGoogle ? (
        <DriveConnectCard onDone={refreshGoogle} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {status.needsDriveTap && (
              <button
                type="button"
                className={button}
                onClick={() => void reconnectDrive(db)}
              >
                {t('sync.reconnectDrive')}
              </button>
            )}
          </div>
          {status.needsDriveTap && (
            <p className="text-sm text-muted">{t('sync.driveTap')}</p>
          )}
        </>
      )}
    </div>
  )
}

function DeviceCheck() {
  const [result, setResult] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer py-2">
        {t('sync.testTitle')}
      </summary>
      <p className="text-muted">{t('sync.testHelp')}</p>
      <button
        type="button"
        className={`${button} mt-2`}
        disabled={busy}
        onClick={() => {
          setBusy(true)
          void checkDevice()
            .then((r) =>
              setResult(
                t('sync.testResult', {
                  ms: r.argonMs,
                  crypto: r.webCrypto ? t('sync.yes') : t('sync.no'),
                  persist: r.persisted ? t('sync.yes') : t('sync.no'),
                }),
              ),
            )
            .finally(() => setBusy(false))
        }}
      >
        {t('sync.testRun')}
      </button>
      {result && (
        <p className="mt-2" data-testid="device-check">
          {result}
        </p>
      )}
    </details>
  )
}
