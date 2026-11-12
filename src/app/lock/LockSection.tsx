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
  isNewPassword,
  isNewPin,
  isPassword,
  isPin,
  NEW_PASSWORD_MIN,
  PASSWORD_MIN,
  storedLength,
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
import { useFlag } from '../flags'
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
  const m1 = useFlag('security.m1')
  const config = useLiveQuery(() => getLockConfig(db), [db])
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
        hint={t(m1 ? 'lock.pin.hint6' : 'lock.pin.hint')}
        isSet={methods.pin}
        note={
          m1 && methods.pin && config && (storedLength(config.pin) ?? 0) < 6
            ? {
                text: t(
                  storedLength(config.pin)
                    ? 'lock.pin.shorter'
                    : 'lock.pin.shorterMaybe',
                ),
                action: t('lock.pin.changeBtn'),
                onAction: () => guarded(() => setEditing('pin')),
              }
            : undefined
        }
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
        hint={t('lock.password.hint', {
          min: m1 ? NEW_PASSWORD_MIN : PASSWORD_MIN,
        })}
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
          m1={m1}
          onClose={() => setEditing(null)}
          onSave={async (value) => {
            const hash = await hashSecret(value)
            const stored = m1 ? { ...hash, len: value.length } : hash
            await save((c) => ({ ...c, [editing]: stored }))
            setEditing(null)
            toast(
              t(
                m1 && editing === 'pin' && methods.pin
                  ? 'lock.pin.changed'
                  : 'lock.saved',
              ),
            )
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
  note,
  isSet,
  disabled,
  onSet,
  onRemove,
}: {
  name: string
  hint: string
  note?: { text: string; action: string; onAction: () => void }
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
        {note && (
          <div
            className="mt-1 flex flex-wrap items-center gap-x-2 text-muted"
            data-testid="pin-short-note"
          >
            <span>{note.text}</span>
            <button type="button" className={btn} onClick={note.onAction}>
              {note.action}
            </button>
          </div>
        )}
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
  m1,
  onClose,
  onSave,
}: {
  kind: 'pin' | 'password'
  m1: boolean
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
  const valid =
    kind === 'pin' ? (m1 ? isNewPin : isPin) : m1 ? isNewPassword : isPassword
  const hint = m1
    ? kind === 'pin'
      ? t('lock.pin.hint6')
      : t('lock.password.hint', { min: NEW_PASSWORD_MIN })
    : null
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid(a)) {
      setError(
        t(kind === 'pin' ? 'lock.pin.invalid' : 'lock.password.invalid', {
          min: m1 ? NEW_PASSWORD_MIN : PASSWORD_MIN,
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
          {t(
            kind === 'pin'
              ? m1
                ? 'lock.pin.new6'
                : 'lock.pin.new'
              : 'lock.password.new',
          )}
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
        {hint && (
          <p className="text-sm text-muted" data-testid="code-hint">
            {hint}
          </p>
        )}
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
          disabled={busy || (m1 && !valid(a))}
          className="mt-1 min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {t('dialog.save')}
        </button>
      </form>
    </LockDialog>
  )
}
