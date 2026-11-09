import { useState, type FormEvent } from 'react'
import { t, type MessageKey } from '../i18n/t'
import { errorKey } from './signInErrors'
import { PASSWORD_MAX, passwordProblem } from './passwordRules'
import { accountAuth, afterAccountSignIn } from './syncService'

/**
 * Sign in or create an account: Google, an email code (6 digits, no
 * password) or email + password (create, sign in, forgot password). Used by
 * the first-run welcome and Settings › Account. Google leaves the page; the
 * other two finish here. After the first sign-in the session is kept with a
 * refresh token, so the password or code is not asked for again.
 */

const field =
  'min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink'
const button =
  'min-h-11 rounded-lg border border-line px-4 text-sm font-medium hover:bg-hover disabled:opacity-50'
const primary =
  'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50'

type View =
  'choose' | 'code' | 'codeEnter' | 'pass' | 'confirm' | 'forgot' | 'reset'

export function SignInPanel({
  onGoogle,
  onDone,
}: {
  /** Starts Google sign-in (leaves the page). */
  onGoogle: () => void
  /** An email step signed the person in. */
  onDone: () => void
}) {
  const [view, setView] = useState<View>('choose')
  const [creating, setCreating] = useState(false)
  const [email, setEmail] = useState('')
  const [secret, setSecret] = useState('') // the 6-digit code
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<MessageKey | null>(null)

  const go = (v: View) => {
    setError(null)
    setSecret('')
    setView(v)
  }

  /** Runs one step; on failure shows the reason, on success `then`. */
  const run = async (step: () => Promise<void>) => {
    setError(null)
    setBusy(true)
    try {
      await step()
    } catch (e) {
      setError(errorKey(e))
    } finally {
      setBusy(false)
    }
  }
  const auth = accountAuth()
  const finished = async () => {
    await afterAccountSignIn()
    onDone()
  }

  const emailField = (
    <label className="flex flex-col gap-1 text-sm">
      {t('signin.email')}
      <input
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value.trim())}
        className={field}
      />
    </label>
  )
  const codeField = (
    <label className="flex flex-col gap-1 text-sm">
      {t('signin.code')}
      <input
        type="text"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        required
        value={secret}
        onChange={(e) => setSecret(e.target.value.replace(/\D/g, ''))}
        className={`${field} tracking-[0.4em]`}
      />
    </label>
  )
  const passField = (label: MessageKey, current: boolean) => (
    <label className="flex flex-col gap-1 text-sm">
      {t(label)}
      <input
        type="password"
        name="password"
        autoComplete={current ? 'current-password' : 'new-password'}
        required
        maxLength={PASSWORD_MAX + 20}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={field}
      />
    </label>
  )
  const problem = passwordProblem(password)
  const passError = (
    <>
      <p className="text-xs text-muted">{t('signin.passHelp')}</p>
      {password && problem && (
        <p className="text-sm text-danger">{t(`signin.pass.${problem}`)}</p>
      )}
    </>
  )
  const errorLine = error && (
    <p role="alert" className="text-sm text-danger" data-testid="signin-error">
      {t(error)}
    </p>
  )
  const back = (to: View = 'choose') => (
    <button type="button" className={button} onClick={() => go(to)}>
      {t('signin.back')}
    </button>
  )
  const submit =
    (fn: () => Promise<void>) => (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      void run(fn)
    }

  let body
  if (view === 'choose') {
    body = (
      <div className="grid gap-2">
        <button
          type="button"
          data-account="google"
          onClick={onGoogle}
          className="min-h-14 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:opacity-90"
        >
          {t('sync.signIn')}
        </button>
        <button
          type="button"
          data-account="code"
          onClick={() => go('code')}
          className="min-h-14 rounded-xl border border-line px-4 text-left hover:bg-hover"
        >
          <span className="block text-sm font-semibold">
            {t('signin.codeBtn')}
          </span>
          <span className="block text-sm text-ink-soft">
            {t('signin.codeBtnHelp')}
          </span>
        </button>
        <button
          type="button"
          data-account="password"
          onClick={() => go('pass')}
          className="min-h-14 rounded-xl border border-line px-4 text-left hover:bg-hover"
        >
          <span className="block text-sm font-semibold">
            {t('signin.passBtn')}
          </span>
          <span className="block text-sm text-ink-soft">
            {t('signin.passBtnHelp')}
          </span>
        </button>
      </div>
    )
  } else if (view === 'code') {
    body = (
      <form
        className="flex flex-col gap-3"
        onSubmit={submit(async () => {
          await auth.emailCodeSend?.(email)
          go('codeEnter')
        })}
      >
        {emailField}
        {errorLine}
        <div className="flex gap-2">
          {back()}
          <button type="submit" className={primary} disabled={busy}>
            {busy ? t('signin.busy') : t('signin.sendCode')}
          </button>
        </div>
      </form>
    )
  } else if (view === 'codeEnter' || view === 'confirm' || view === 'reset') {
    const kind =
      view === 'confirm' ? 'signup' : view === 'reset' ? 'recovery' : 'email'
    const resetBad = view === 'reset' && problem !== null
    body = (
      <form
        className="flex flex-col gap-3"
        onSubmit={submit(async () => {
          await auth.emailCodeVerify?.(email, secret, kind)
          if (view === 'reset') await auth.setPassword?.(password)
          await finished()
        })}
      >
        <p className="text-sm text-ink-soft" role="status">
          {view === 'confirm'
            ? t('signin.confirmSent', { email })
            : t('signin.codeSent', { email })}
        </p>
        {codeField}
        {view === 'reset' && (
          <>
            {passField('signin.newPassword', false)}
            {passError}
          </>
        )}
        {errorLine}
        <div className="flex flex-wrap gap-2">
          {back(
            view === 'confirm' ? 'pass' : view === 'reset' ? 'forgot' : 'code',
          )}
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (view === 'confirm')
                  await auth.passwordSignUp?.(email, password)
                else if (view === 'reset') await auth.passwordResetSend?.(email)
                else await auth.emailCodeSend?.(email)
              })
            }
          >
            {t('signin.resend')}
          </button>
          <button
            type="submit"
            className={primary}
            disabled={busy || secret.length !== 6 || resetBad}
          >
            {busy
              ? t('signin.busy')
              : view === 'reset'
                ? t('signin.resetGo')
                : t('signin.verify')}
          </button>
        </div>
      </form>
    )
  } else if (view === 'forgot') {
    body = (
      <form
        className="flex flex-col gap-3"
        onSubmit={submit(async () => {
          await auth.passwordResetSend?.(email)
          go('reset')
        })}
      >
        <p className="text-sm text-ink-soft">{t('signin.resetHelp')}</p>
        {emailField}
        {errorLine}
        <div className="flex gap-2">
          {back('pass')}
          <button type="submit" className={primary} disabled={busy}>
            {busy ? t('signin.busy') : t('signin.resetSend')}
          </button>
        </div>
      </form>
    )
  } else {
    // 'pass': sign in or create an account.
    body = (
      <form
        className="flex flex-col gap-3"
        onSubmit={submit(async () => {
          if (creating) {
            const r = await auth.passwordSignUp?.(email, password)
            if (r === 'signedIn') await finished()
            else go('confirm')
          } else {
            await auth.passwordSignIn?.(email, password)
            await finished()
          }
        })}
      >
        <div role="tablist" className="flex gap-2">
          {([false, true] as const).map((up) => (
            <button
              key={String(up)}
              type="button"
              role="tab"
              aria-selected={creating === up}
              onClick={() => {
                setCreating(up)
                setError(null)
              }}
              className={`min-h-11 rounded-lg border px-4 text-sm ${
                creating === up
                  ? 'border-accent bg-hover font-semibold text-accent'
                  : 'border-line hover:bg-hover'
              }`}
            >
              {t(up ? 'signin.tabUp' : 'signin.tabIn')}
            </button>
          ))}
        </div>
        {emailField}
        {passField('signin.password', !creating)}
        {creating && passError}
        {errorLine}
        <div className="flex flex-wrap items-center gap-2">
          {back()}
          <button
            type="submit"
            className={primary}
            disabled={busy || (creating && problem !== null)}
          >
            {busy
              ? t('signin.busy')
              : creating
                ? t('signin.create')
                : t('signin.tabIn')}
          </button>
          {!creating && (
            <button
              type="button"
              className="min-h-11 px-2 text-sm underline"
              onClick={() => go('forgot')}
            >
              {t('signin.forgot')}
            </button>
          )}
        </div>
      </form>
    )
  }

  return (
    <div data-testid="signin-panel" data-view={view}>
      {body}
    </div>
  )
}
