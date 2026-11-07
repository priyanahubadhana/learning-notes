import { useEffect, useState, useSyncExternalStore } from 'react'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import { passphraseProblem } from './crypto'
import { checkDevice } from './deviceCheck'
import { SyncDot } from './SyncDot'
import {
  dismissMerged,
  getSyncStatus,
  reconnectDrive,
  setUpKey,
  signIn,
  signOut,
  startSync,
  subscribeSync,
  syncNow,
  unlock,
} from './syncService'

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
 * status, Sync now, Reconnect Drive and sign out. Signing in or out never
 * touches the notes on this device.
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
        <RecoveryCode code={code} onDone={() => setCode(null)} />
      ) : status.phase === 'signedOut' ? (
        <div>
          <button
            type="button"
            className={primary}
            onClick={() => void signIn()}
          >
            {t('sync.signIn')}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm">
            {t('sync.signedInAs', { email: status.email ?? '' })}
          </p>
          {status.phase === 'needsSetup' && (
            <SetUp
              onMade={async (p) =>
                setCode((await setUpKey(db, p)).recoveryCode)
              }
            />
          )}
          {status.phase === 'needsKey' && <Unlock db={db} />}
          {(status.phase === 'ready' || status.phase === 'syncing') && (
            <Running db={db} />
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={button}
              onClick={() => void signOut(false)}
            >
              {t('sync.signOut')}
            </button>
            <button
              type="button"
              className={button}
              onClick={() => void signOut(true)}
            >
              {t('sync.signOutForget')}
            </button>
          </div>
        </>
      )}
      <p className="text-xs text-muted">{t('sync.privacy')}</p>
      <DeviceCheck />
    </section>
  )
}

function SetUp({ onMade }: { onMade: (p: string) => Promise<void> }) {
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
        <input
          type="password"
          autoComplete="new-password"
          className={field}
          value={p1}
          onChange={(e) => setP1(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t('sync.passphraseAgain')}
        <input
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

function RecoveryCode({ code, onDone }: { code: string; onDone: () => void }) {
  const [check, setCheck] = useState('')
  const [wrong, setWrong] = useState(false)
  const last = code.replace(/-/g, '').slice(-4)
  return (
    <div className="flex flex-col gap-3">
      <style>
        {
          '@media print { body * { visibility: hidden } [data-print-code], [data-print-code] * { visibility: visible } [data-print-code] { position: fixed; inset: 0; padding: 2rem } }'
        }
      </style>
      <div
        data-print-code
        className="rounded-lg border border-line p-4"
        data-testid="recovery-code"
      >
        <h3 className="text-sm font-semibold">{t('sync.codeTitle')}</h3>
        <p className="my-3 font-mono text-lg tracking-wider select-all">
          {code}
        </p>
        <p className="text-sm text-muted">{t('sync.codeHelp')}</p>
      </div>
      <div>
        <button type="button" className={button} onClick={() => window.print()}>
          {t('sync.print')}
        </button>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        {t('sync.codeCheck')}
        <input
          className={field}
          value={check}
          autoComplete="off"
          onChange={(e) => {
            setCheck(e.target.value)
            setWrong(false)
          }}
        />
      </label>
      {wrong && <p className="text-sm text-danger">{t('sync.codeWrong')}</p>}
      <div>
        <button
          type="button"
          className={primary}
          onClick={() =>
            check.trim().toUpperCase() === last ? onDone() : setWrong(true)
          }
        >
          {t('sync.codeDone')}
        </button>
      </div>
    </div>
  )
}

function Unlock({ db }: { db: LearningNotesDB }) {
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [wrong, setWrong] = useState(false)
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        setBusy(true)
        setWrong(false)
        void unlock(db, secret)
          .then((ok) => setWrong(!ok))
          .finally(() => setBusy(false))
      }}
    >
      <h3 className="text-sm font-semibold">{t('sync.unlockTitle')}</h3>
      <p className="text-sm text-muted">{t('sync.unlockHelp')}</p>
      <label className="flex flex-col gap-1 text-sm">
        {t('sync.passphrase')}
        <input
          type="password"
          autoComplete="current-password"
          className={field}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
      </label>
      {wrong && <p className="text-sm text-danger">{t('sync.wrongSecret')}</p>}
      <div>
        <button type="submit" className={primary} disabled={busy || !secret}>
          {busy ? t('sync.working') : t('sync.unlock')}
        </button>
      </div>
    </form>
  )
}

function Running({ db }: { db: LearningNotesDB }) {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus)
  return (
    <div className="flex flex-col gap-3">
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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={button}
          disabled={status.phase === 'syncing'}
          onClick={() => void syncNow(db)}
        >
          {t('sync.syncNow')}
        </button>
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
