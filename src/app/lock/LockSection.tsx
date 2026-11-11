import { useLiveQuery } from 'dexie-react-hooks'
import {
  useContext,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react'
import type { LearningNotesDB } from '../../core/db'
import {
  getLockConfig,
  lockIsSetUp,
  saveLockConfig,
  type LockConfig,
} from '../../core/lock/lockConfig'
import {
  hashSecret,
  isPassword,
  isPin,
  PASSWORD_MIN,
  PASSWORD_RECOMMENDED as RECOMMENDED,
} from '../../core/lock/lockCrypto'
import {
  listLocked,
  removeAllLocks,
  setLocked,
} from '../../core/lock/lockService'
import { relockAll } from '../../core/lock/lockState'
import {
  createPasskey,
  forgetPasskey,
  passkeyAvailable,
} from '../../core/lock/webauthn'
import { HelpLine } from '../../help/Help'
import { t } from '../../i18n/t'
import { getSyncStatus, subscribeSync } from '../../sync/syncStatus'
import { AppUiContext } from '../appUi'
import { runTask } from '../errors'
import { ConfirmDialog } from '../ui'
import { AuthDialog, LockDialog } from './LockDialogs'
import { useLockMethods } from './useLock'
import { sampleName } from '../../i18n/defaultNames'

/**
 * Settings › Lock: the plain truth about the lock, the ways to unlock, and
 * what is locked. Changing or removing a code asks for the current one
 * first (or the device lock), unless the lock is not set up yet.
 */

const btn =
  'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-40'

export function LockSection({ db }: { db: LearningNotesDB }) {
  const { toast } = useContext(AppUiContext)
  const methods = useLockMethods(db)
  const items = useLiveQuery(() => listLocked(db), [db])
  const available = useLiveQuery(() => passkeyAvailable(), [])
  const [editing, setEditing] = useState<'pin' | 'password' | null>(null)
  const [auth, setAuth] = useState<null | (() => void)>(null)
  const [confirmAll, setConfirmAll] = useState(false)

  if (!methods) return null
  const setUp = lockIsSetUp(methods)

  /** Runs `action` after the current code is confirmed (at once if none yet). */
  const guarded = (action: () => void) => {
    if (!setUp) action()
    else setAuth(() => action)
  }

  const save = async (change: (c: LockConfig) => LockConfig) => {
    await saveLockConfig(db, change(await getLockConfig(db)))
  }

  const total =
    (items?.pages.length ?? 0) +
    (items?.notebooks.length ?? 0) +
    (items?.databases.length ?? 0)

  return (
    <section
      aria-labelledby="lock-title"
      data-testid="lock-section"
      className="mb-6 rounded-lg border border-line p-4 text-sm leading-relaxed"
    >
      <h2 id="lock-title" className="mb-1 font-semibold">
        {t('lock.title')}
      </h2>
      <HelpLine id="lock.privacy" className="mb-2 text-xs text-muted" />
      <p>{t('lock.explain')}</p>
      <p className="mt-1 text-muted">{t('lock.explain2')}</p>

      <h3 className="mt-4 mb-1 font-semibold">{t('lock.methods')}</h3>
      <MethodRow
        name={t('lock.pin')}
        hint={t('lock.pin.hint')}
        isSet={methods.pin}
        onSet={() => guarded(() => setEditing('pin'))}
        onRemove={() =>
          guarded(() =>
            runTask(
              save((c) => ({ ...c, pin: undefined })).then(() =>
                toast(t('lock.removedMethod')),
              ),
            ),
          )
        }
      />
      <MethodRow
        name={t('lock.password')}
        hint={t('lock.password.hint', { min: PASSWORD_MIN })}
        isSet={methods.password}
        onSet={() => guarded(() => setEditing('password'))}
        onRemove={() =>
          guarded(() =>
            runTask(
              save((c) => ({ ...c, password: undefined })).then(() =>
                toast(t('lock.removedMethod')),
              ),
            ),
          )
        }
      />
      <MethodRow
        name={t('lock.device')}
        hint={
          available === false
            ? t('lock.device.unavailable')
            : t('lock.device.hint')
        }
        isSet={methods.passkey}
        disabled={available === false && !methods.passkey}
        onSet={() =>
          guarded(() =>
            runTask(
              createPasskey().then(async (result) => {
                if (result === 'ok') {
                  await save((c) => c) // tells the screens the lock changed
                  toast(t('lock.device.done'))
                } else if (result !== 'cancelled') {
                  toast(t('lock.device.failed'))
                }
              }),
            ),
          )
        }
        onRemove={() =>
          guarded(() =>
            runTask(
              (async () => {
                forgetPasskey()
                await save((c) => c)
                toast(t('lock.removedMethod'))
              })(),
            ),
          )
        }
      />
      {!setUp && <p className="mt-2 text-muted">{t('lock.noneYet')}</p>}

      <h3 className="mt-4 mb-1 font-semibold">{t('lock.locked')}</h3>
      {items && total === 0 && (
        <p className="text-muted">{t('lock.nothing')}</p>
      )}
      {items && total > 0 && (
        <ul data-testid="locked-list">
          {[
            ...items.notebooks.map((n) => ({
              kind: 'notebook' as const,
              id: n.id,
              title: sampleName(n),
            })),
            ...items.pages.map((p) => ({
              kind: 'page' as const,
              id: p.id,
              title: sampleName(p),
            })),
            ...items.databases.map((d) => ({
              kind: 'database' as const,
              id: d.id,
              title: d.title,
            })),
          ].map((item) => (
            <li
              key={`${item.kind}:${item.id}`}
              className="flex items-center justify-between gap-2 border-b border-line py-1 last:border-0"
            >
              <span className="min-w-0 truncate">
                🔒 {item.title || t('review.untitled')}{' '}
                <span className="text-muted">
                  ({t(`lock.kind.${item.kind}`)})
                </span>
              </span>
              <button
                type="button"
                className={btn}
                onClick={() =>
                  guarded(() =>
                    runTask(
                      setLocked(db, item.kind, item.id, false).then(() =>
                        toast(t('lock.itemUnlocked')),
                      ),
                    ),
                  )
                }
              >
                {t('lock.removeFrom')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {(setUp || total > 0) && (
        <div className="mt-4 border-t border-line pt-3">
          <button
            type="button"
            className={`${btn} text-danger`}
            onClick={() => guarded(() => setConfirmAll(true))}
          >
            {t('lock.removeAll')}
          </button>
        </div>
      )}

      {editing && (
        <SetCodeDialog
          kind={editing}
          onClose={() => setEditing(null)}
          onSave={async (value) => {
            const hash = await hashSecret(value)
            await save((c) => ({ ...c, [editing]: hash }))
            setEditing(null)
            toast(t('lock.saved'))
          }}
        />
      )}
      {auth && (
        <AuthDialog
          db={db}
          methods={methods}
          onCancel={() => setAuth(null)}
          onDone={() => {
            const run = auth
            setAuth(null)
            run()
          }}
        />
      )}
      {confirmAll && (
        <ConfirmDialog
          message={t('lock.removeAll.confirm', { count: total })}
          confirmLabel={t('lock.removeAll.yes')}
          onCancel={() => setConfirmAll(false)}
          onConfirm={() => {
            setConfirmAll(false)
            runTask(
              removeAllLocks(db).then(() => {
                relockAll()
              }),
            )
          }}
        />
      )}
    </section>
  )
}

function MethodRow({
  name,
  hint,
  isSet,
  disabled,
  onSet,
  onRemove,
}: {
  name: string
  hint: string
  isSet: boolean
  disabled?: boolean
  onSet: () => void
  onRemove: () => void
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 last:border-0"
      data-testid={`method-${name}`}
    >
      <div className="min-w-0 flex-1">
        <div className="font-medium">
          {name}{' '}
          <span className="font-normal text-muted">
            {isSet ? t('lock.isSet') : t('lock.notSet')}
          </span>
        </div>
        <div className="text-muted">{hint}</div>
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          className={btn}
          disabled={disabled}
          onClick={onSet}
        >
          {isSet ? t('lock.change') : t('lock.setUp')}
        </button>
        {isSet && (
          <button type="button" className={btn} onClick={onRemove}>
            {t('lock.remove')}
          </button>
        )}
      </div>
    </div>
  )
}

function SetCodeDialog({
  kind,
  onClose,
  onSave,
}: {
  kind: 'pin' | 'password'
  onClose: () => void
  onSave: (value: string) => Promise<void>
}) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // With sync on, the code's hash travels with the synced settings: push for a long password.
  const synced =
    useSyncExternalStore(subscribeSync, getSyncStatus).phase !== 'signedOut'
  const short = kind === 'password' && a.length > 0 && a.length < RECOMMENDED
  const valid = kind === 'pin' ? isPin : isPassword
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid(a)) {
      setError(
        t(kind === 'pin' ? 'lock.pin.invalid' : 'lock.password.invalid', {
          min: PASSWORD_MIN,
        }),
      )
      return
    }
    if (a !== b) {
      setError(t('lock.mismatch'))
      return
    }
    setBusy(true)
    try {
      await onSave(a)
    } finally {
      setBusy(false)
    }
  }
  return (
    <LockDialog
      title={t(kind === 'pin' ? 'lock.pin.set' : 'lock.password.set')}
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex flex-col gap-2">
        <label htmlFor="code-a" className="text-sm">
          {t(kind === 'pin' ? 'lock.pin.new' : 'lock.password.new')}
        </label>
        <input
          id="code-a"
          type="password"
          autoFocus
          value={a}
          inputMode={kind === 'pin' ? 'numeric' : 'text'}
          maxLength={kind === 'pin' ? 6 : 128}
          autoComplete="new-password"
          onChange={(e) =>
            setA(
              kind === 'pin'
                ? e.target.value.replace(/\D/g, '')
                : e.target.value,
            )
          }
          className="min-h-11 rounded-lg border border-line bg-bg px-3 outline-none focus:border-accent"
        />
        <label htmlFor="code-b" className="text-sm">
          {t('lock.confirm')}
        </label>
        <input
          id="code-b"
          type="password"
          value={b}
          inputMode={kind === 'pin' ? 'numeric' : 'text'}
          maxLength={kind === 'pin' ? 6 : 128}
          autoComplete="new-password"
          onChange={(e) =>
            setB(
              kind === 'pin'
                ? e.target.value.replace(/\D/g, '')
                : e.target.value,
            )
          }
          className="min-h-11 rounded-lg border border-line bg-bg px-3 outline-none focus:border-accent"
        />
        {synced && (
          <p className="text-sm text-muted" data-testid="lock-sync-note">
            {t(kind === 'pin' ? 'lock.sync.pin' : 'lock.sync.password')}
          </p>
        )}
        {synced && short && (
          <p className="text-sm text-muted">{t('lock.sync.short')}</p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-1 min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {t('dialog.save')}
        </button>
      </form>
    </LockDialog>
  )
}
