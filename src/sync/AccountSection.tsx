import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { SettingsLink } from '../settings/SettingsLink'
import { useLockMethods } from '../app/lock/useLock'
import { ConfirmDialog } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import { lockIsSetUp } from '../core/lock/lockConfig'
import { t } from '../i18n/t'
import { ConnectedAccounts } from './ConnectedAccounts'
import { isTracking } from './device'
import { RecoveryCodeView } from './RecoveryCodeView'
import { SignInPanel } from './SignInPanel'
import { UnlockForm } from './UnlockForm'
import {
  driveLastingState,
  aiKeysSyncOn,
  getSyncStatus,
  makeNewRecoveryCode,
  setUpLastingDrive,
  signIn,
  signOut,
  signOutEverywhere,
  startSync,
  subscribeSync,
  syncNow,
} from './syncService'

const button =
  'min-h-11 rounded-lg border border-line px-4 text-sm font-medium hover:bg-hover disabled:opacity-50'

const when = (ms: number) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(ms)

/**
 * Settings › Account: everything about the person's account in one place.
 * Who (sign in), Connections (Google Drive, Sync now), Security (recovery
 * code, unlock state, links to Lock and AI) and Sessions (sign out here, sign
 * out and forget the key, sign out on all devices). Each control lives here
 * or in its own section, never both: Sync, Lock and AI link back. Signing
 * out never touches the notes on this device.
 */
export function AccountSection({ db }: { db: LearningNotesDB }) {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus)
  useEffect(() => {
    void startSync(db)
  }, [db])
  const signedIn = status.phase !== 'signedOut'
  const [doneAll, setDoneAll] = useState(false)

  return (
    <section data-testid="account-section" className="mb-6 flex flex-col gap-6">
      <h2 className="text-base font-semibold">{t('account.title')}</h2>
      <Group id="who" title={t('account.who')}>
        {signedIn ? (
          <div className="flex items-center gap-3">
            <Avatar url={status.avatar} email={status.email ?? ''} />
            <div className="min-w-0">
              <p
                className="truncate text-sm font-medium"
                data-testid="account-email"
              >
                {status.email}
              </p>
              <p className="text-xs text-muted">{t('account.signedIn')}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2" data-setting-id="account.signIn">
            <p className="text-sm text-muted">{t('account.signedOut')}</p>
            {doneAll && (
              <p
                className="text-sm"
                role="status"
                data-testid="account-all-done"
              >
                {t('account.signOutAll.done')}
              </p>
            )}
            <SignInPanel
              onGoogle={() => void signIn()}
              onDone={() => undefined}
            />
          </div>
        )}
      </Group>
      {signedIn && (
        <>
          <Group id="connections" title={t('account.connections')}>
            <SyncLine db={db} />
            <DriveLasting />
          </Group>
          <Group id="connected" title={t('connected.title')}>
            <ConnectedAccounts />
          </Group>
          <Group id="security" title={t('account.security')}>
            <Security db={db} />
          </Group>
          <Group id="sessions" title={t('account.sessions')}>
            <Sessions onAll={() => setDoneAll(true)} />
          </Group>
        </>
      )}
    </section>
  )
}

function Group({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <div
      className="flex flex-col gap-3"
      role="group"
      aria-labelledby={`account-${id}`}
    >
      <h3 id={`account-${id}`} className="text-sm font-semibold">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Avatar({ url, email }: { url?: string; email: string }) {
  const [broken, setBroken] = useState(false)
  if (url && !broken)
    return (
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="size-12 shrink-0 rounded-full border border-line object-cover"
      />
    )
  return (
    <span
      aria-hidden
      className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-hover text-base font-semibold uppercase"
    >
      {email.slice(0, 1)}
    </span>
  )
}

/** Sync status and Sync now (the sync options themselves are in Sync). */
function SyncLine({ db }: { db: LearningNotesDB }) {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus)
  const running = status.phase === 'ready' || status.phase === 'syncing'
  return (
    <div className="flex flex-col gap-2" data-setting-id="account.syncNow">
      <p
        className="text-sm"
        data-testid="account-sync-status"
        aria-live="polite"
      >
        {!running
          ? t('account.syncLocked')
          : status.phase === 'syncing'
            ? t('sync.syncing')
            : status.lastSyncedAt
              ? t('sync.last', { time: when(status.lastSyncedAt) })
              : t('sync.never')}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {running && (
          <button
            type="button"
            className={button}
            disabled={status.phase === 'syncing'}
            onClick={() => void syncNow(db)}
          >
            {t('sync.syncNow')}
          </button>
        )}
        <SettingsLink to="category:sync" className="text-sm underline">
          {running ? t('account.syncOptions') : t('account.unlockInSync')}
        </SettingsLink>
      </div>
    </div>
  )
}

/** Lock and AI keys: the state shows here, the control stays in its section. */
function Security({ db }: { db: LearningNotesDB }) {
  const [keysOn, setKeysOn] = useState(false)
  useEffect(() => {
    void aiKeysSyncOn().then(setKeysOn)
  }, [])
  const status = useSyncExternalStore(subscribeSync, getSyncStatus)
  const methods = useLockMethods(db)
  const unlocked = status.phase === 'ready' || status.phase === 'syncing'
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm" data-testid="account-key-state">
        {unlocked ? t('account.keyOn') : t('account.keyOff')}
      </p>
      {unlocked && <NewCode />}
      <p className="text-sm" data-setting-id="account.pinLock">
        {methods && lockIsSetUp(methods)
          ? t('account.lockOn')
          : t('account.lockOff')}{' '}
        <SettingsLink to="lock/lock.idleMinutes">
          {t('account.changeInLock')}
        </SettingsLink>
      </p>
      <p className="text-sm" data-setting-id="account.aiKeys">
        {keysOn && isTracking()
          ? t('account.aiKeysOn')
          : t('account.aiKeysOff')}{' '}
        <SettingsLink to="ai/ai.keyList">
          {t('account.changeInAi')}
        </SettingsLink>
      </p>
    </div>
  )
}

/** Sign out here, sign out and forget the key here, sign out everywhere. */
function Sessions({ onAll }: { onAll: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={button}
          data-setting-id="account.signOut"
          onClick={() => void signOut(false)}
        >
          {t('sync.signOut')}
        </button>
        <button
          type="button"
          className={button}
          data-setting-id="account.signOutForget"
          onClick={() => void signOut(true)}
        >
          {t('sync.signOutForget')}
        </button>
        <button
          type="button"
          className={button}
          data-setting-id="account.signOutAll"
          disabled={busy}
          onClick={() => {
            setFailed(false)
            setConfirm(true)
          }}
        >
          {t('account.signOutAll')}
        </button>
      </div>
      {failed && (
        <p
          role="alert"
          className="text-sm text-danger"
          data-testid="account-all-failed"
        >
          {t('account.signOutAll.failed')}
        </p>
      )}
      {confirm && (
        <ConfirmDialog
          message={t('account.signOutAll.confirm')}
          confirmLabel={t('account.signOutAll.go')}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false)
            setBusy(true)
            void signOutEverywhere()
              .then((ok) => (ok ? onAll() : setFailed(true)))
              .finally(() => setBusy(false))
          }}
        />
      )}
    </div>
  )
}

function DriveLasting() {
  const d = driveLastingState()
  if (!d) return null
  const kept = d.state === 'kept'
  return (
    <div
      className="flex flex-col gap-2"
      data-testid="drive-lasting"
      data-setting-id="account.driveLasting"
    >
      <p className="text-sm" role="status">
        {kept ? t('sync.driveKept') : t('sync.driveWillAsk')}
      </p>
      {!kept && (
        <>
          {d.note && <p className="text-xs text-muted">{d.note}</p>}
          <div>
            <button
              type="button"
              className={button}
              onClick={() => void setUpLastingDrive()}
            >
              {t('sync.driveSetUp')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * "Make a new recovery code" (signed in and unlocked only): asks for the
 * passphrase again, then shows the new code. The old code stops working; the
 * notes are not re-encrypted.
 */
function NewCode() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<'failed' | null>(null)
  const [made, setMade] = useState<{
    code: string
    oldRemoved: boolean
  } | null>(null)
  const [saved, setSaved] = useState(false)
  const reset = () => {
    setOpen(false)
    setError(null)
    setMade(null)
  }
  if (saved && !open)
    return (
      <p className="text-sm" role="status" data-testid="new-code-saved">
        {t('sync.newCodeSaved')}
      </p>
    )
  if (made)
    return (
      <div className="flex flex-col gap-3" data-testid="new-code">
        {!made.oldRemoved && (
          <p role="alert" className="text-sm text-danger">
            {t('sync.newCodeOldLeft')}
          </p>
        )}
        <RecoveryCodeView
          code={made.code}
          onDone={() => {
            setSaved(made.oldRemoved)
            reset()
          }}
        />
      </div>
    )
  if (!open)
    return (
      <div data-setting-id="account.newCode">
        <button
          type="button"
          className={button}
          onClick={() => {
            setSaved(false)
            setOpen(true)
          }}
        >
          {t('sync.newCode')}
        </button>
      </div>
    )
  return (
    <>
      <UnlockForm
        kinds={['passphrase']}
        testId="new-code-form"
        title={t('sync.newCode')}
        help={t('sync.newCodeHelp')}
        submitLabel={t('sync.newCodeGo')}
        submit={async (secret) => {
          setError(null)
          try {
            const r = await makeNewRecoveryCode(secret)
            if (!r) return 'wrong'
            setMade({ code: r.recoveryCode, oldRemoved: r.oldRemoved })
            return 'ok'
          } catch {
            setError('failed')
            return 'error'
          }
        }}
        extra={
          <>
            {error === 'failed' && (
              <p role="alert" className="text-sm text-danger">
                {t('sync.newCodeFailed')}
              </p>
            )}
            <div>
              <button type="button" className={button} onClick={reset}>
                {t('sync.newCodeCancel')}
              </button>
            </div>
          </>
        }
      />
    </>
  )
}
