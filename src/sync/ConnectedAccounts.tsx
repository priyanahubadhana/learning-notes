import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ConfirmDialog } from '../app/ui'
import { t, type MessageKey } from '../i18n/t'
import type { SignInMethods } from './connectors'
import { passwordProblem } from './passwordRules'
import { errorKey } from './signInErrors'
import { accountAuth, linkGoogleAccount } from './syncService'

const button =
  'min-h-11 rounded-lg border border-line px-4 text-sm font-medium hover:bg-hover disabled:opacity-50'
const primary =
  'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50'

/**
 * Settings › Account › Connected accounts (like GitHub or Discord): the ways
 * this account can sign in, each with its email. Connect Google, add or
 * change a password, disconnect a method, but never the last one (the server
 * refuses, and the button is hidden). The email code is the account's email
 * identity; a password belongs to the same identity and can be changed, not
 * removed.
 */
export function ConnectedAccounts() {
  const [methods, setMethods] = useState<SignInMethods | null>(null)
  const [failed, setFailed] = useState(false)
  // A failed "connect Google" comes back as a note, once.
  const [note, setNote] = useState<MessageKey | null>(() =>
    accountAuth().takeLinkError?.() ? 'connected.linkFailed' : null,
  )
  const [tick, setTick] = useState(0)
  const [confirm, setConfirm] = useState<'google' | 'email' | null>(null)

  const load = useCallback(() => setTick((n) => n + 1), [])
  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const m = await accountAuth().methods?.()
        if (!live) return
        if (m) setMethods(m)
        setFailed(!m)
      } catch {
        if (live) setFailed(true)
      }
    })()
    return () => {
      live = false
    }
  }, [tick])

  const count = methods
    ? [methods.google, methods.email?.id ? methods.email : undefined].filter(
        Boolean,
      ).length
    : 0
  const unlink = async (which: 'google' | 'email') => {
    const id = methods?.[which]?.id
    if (!id) return
    try {
      await accountAuth().unlinkIdentity?.(id)
      setNote(null)
    } catch {
      setNote('connected.unlinkFailed')
    }
    load()
  }

  return (
    <div
      className="flex flex-col gap-3"
      data-testid="connected-accounts"
      data-setting-id="account.connected"
    >
      <p className="text-sm text-muted">{t('connected.help')}</p>
      {!methods ? (
        <p className="text-sm" role="status">
          {failed ? t('connected.loadFailed') : t('connected.loading')}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
          <Row
            id="google"
            name={t('connected.google')}
            on={!!methods.google}
            detail={
              methods.google
                ? t('connected.googleOn', { email: methods.google.email })
                : t('connected.googleOff')
            }
            action={
              methods.google ? (
                count > 1 && (
                  <button
                    type="button"
                    className={button}
                    onClick={() => setConfirm('google')}
                  >
                    {t('connected.disconnect')}
                  </button>
                )
              ) : (
                <button
                  type="button"
                  className={button}
                  onClick={() => void linkGoogleAccount().then(load)}
                >
                  {t('connected.connect')}
                </button>
              )
            }
          />
          <Row
            id="code"
            name={t('connected.code')}
            on={!!methods.email}
            detail={
              methods.email
                ? t('connected.codeOn', { email: methods.email.email })
                : t('connected.codeOff')
            }
            action={
              methods.email?.id &&
              count > 1 && (
                <button
                  type="button"
                  className={button}
                  onClick={() => setConfirm('email')}
                >
                  {t('connected.disconnect')}
                </button>
              )
            }
          />
          <Row
            id="password"
            name={t('connected.password')}
            on={methods.password}
            detail={
              methods.password && methods.email
                ? t('connected.passwordOn', { email: methods.email.email })
                : t('connected.passwordOff')
            }
            action={
              methods.email ? (
                <PasswordEditor
                  has={methods.password}
                  onSaved={() => {
                    setNote('connected.passwordSaved')
                    load()
                  }}
                />
              ) : null
            }
          />
        </ul>
      )}
      {methods && count < 2 && (
        <p className="text-xs text-muted">{t('connected.onlyOne')}</p>
      )}
      {note && (
        <p role="status" className="text-sm" data-testid="connected-note">
          {t(note)}
        </p>
      )}
      {confirm && (
        <ConfirmDialog
          message={t('connected.confirm', {
            name:
              confirm === 'google'
                ? t('connected.google')
                : t('connected.code'),
          })}
          confirmLabel={t('connected.confirmGo')}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const which = confirm
            setConfirm(null)
            void unlink(which)
          }}
        />
      )}
    </div>
  )
}

function Row({
  id,
  name,
  detail,
  on,
  action,
}: {
  id: string
  name: string
  detail: string
  on: boolean
  action: React.ReactNode
}) {
  return (
    <li
      className="flex flex-wrap items-center gap-3 p-3"
      data-method={id}
      data-connected={on}
    >
      <div className="min-w-0 grow">
        <p className="text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted">{detail}</p>
      </div>
      {action}
    </li>
  )
}

/** Add or change the password (15+ characters, no other rules). */
function PasswordEditor({
  has,
  onSaved,
}: {
  has: boolean
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<MessageKey | null>(null)
  const problem = passwordProblem(password)

  if (!open)
    return (
      <button type="button" className={button} onClick={() => setOpen(true)}>
        {has ? t('connected.changePassword') : t('connected.addPassword')}
      </button>
    )
  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await accountAuth().setPassword?.(password)
      setOpen(false)
      setPassword('')
      onSaved()
    } catch (err) {
      setError(errorKey(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="flex w-full flex-col gap-2" onSubmit={save}>
      <label className="flex flex-col gap-1 text-sm">
        {t('signin.newPassword')}
        <input
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
        />
      </label>
      <p className="text-xs text-muted">{t('signin.passHelp')}</p>
      {password && problem && (
        <p className="text-sm text-danger">{t(`signin.pass.${problem}`)}</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t(error)}
        </p>
      )}
      <div className="flex gap-2">
        <button type="button" className={button} onClick={() => setOpen(false)}>
          {t('signin.back')}
        </button>
        <button
          type="submit"
          className={primary}
          disabled={busy || problem !== null}
        >
          {t('connected.savePassword')}
        </button>
      </div>
    </form>
  )
}
