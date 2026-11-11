import { useEffect, useState } from 'react'
import { t } from '../i18n/t'
import { accountAuth } from '../sync/syncService'
import {
  consentDecide,
  consentInfo,
  type ConsentInfo,
} from '../sync/connectors/connectServer'
import {
  isClaudeAddress,
  parseConnectHash,
  type ConnectParams,
} from './connectRoute'

/**
 * The consent screen of the online Claude connector (`#/connect?...`). Claude
 * sends the person here; they see who is asking and what it may do, then Allow
 * or Not now. The server re-checks everything; the only place we ever send the
 * browser afterwards is a claude.ai or claude.com address.
 */

const primary =
  'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50'
const secondary =
  'min-h-11 rounded-lg border border-line px-4 text-sm font-medium hover:bg-hover disabled:opacity-50'

type State =
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'bad' }
  | { kind: 'error' }
  | { kind: 'ask'; info: ConsentInfo }
  | { kind: 'working' }

const SCOPE_KEY = {
  'notes:read': 'connect.scope.read',
  'notes:write': 'connect.scope.write',
} as const

export default function ConnectPage() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [params] = useState<ConnectParams | null>(() =>
    parseConnectHash(location.hash),
  )

  useEffect(() => {
    let alive = true
    void (async () => {
      if (!params) return setState({ kind: 'bad' })
      if (!accountAuth().current()) return setState({ kind: 'signedOut' })
      try {
        const token = await accountAuth().accessToken()
        const r = await consentInfo(token, params)
        if (!alive) return
        if (r.ok) setState({ kind: 'ask', info: r.value })
        else
          setState({
            kind:
              r.reason === 'login'
                ? 'signedOut'
                : r.reason === 'bad'
                  ? 'bad'
                  : 'error',
          })
      } catch {
        if (alive) setState({ kind: 'error' })
      }
    })()
    return () => {
      alive = false
    }
  }, [params])

  const decide = async (action: 'approve' | 'deny') => {
    if (!params) return
    setState({ kind: 'working' })
    try {
      const r = await consentDecide(
        await accountAuth().accessToken(),
        action,
        params,
      )
      if (r.ok && isClaudeAddress(r.value.redirect)) {
        location.replace(r.value.redirect)
        return
      }
      setState({ kind: r.ok || r.reason === 'bad' ? 'bad' : 'error' })
    } catch {
      setState({ kind: 'error' })
    }
  }

  const openApp = () => {
    location.hash = ''
    location.reload()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4 text-ink">
      <div className="glass w-[min(26rem,100%)] rounded-2xl p-6">
        <h1 className="mb-3 text-xl font-semibold">{t('connect.title')}</h1>
        {state.kind === 'loading' || state.kind === 'working' ? (
          <p className="text-sm text-muted" role="status">
            {t('connect.working')}
          </p>
        ) : null}
        {state.kind === 'ask' ? (
          <>
            <p className="mb-3 text-sm">
              {t('connect.intro', { name: state.info.clientName })}
            </p>
            <p className="mb-1 text-sm font-medium">{t('connect.canDo')}</p>
            <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
              {state.info.scopes.map((s) => (
                <li key={s.id}>
                  {s.id in SCOPE_KEY
                    ? t(SCOPE_KEY[s.id as keyof typeof SCOPE_KEY])
                    : s.label}
                </li>
              ))}
            </ul>
            <p className="mb-4 text-xs text-muted">
              {t('connect.sendsTo', { host: state.info.redirectHost })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={primary}
                onClick={() => void decide('approve')}
              >
                {t('connect.allow')}
              </button>
              <button
                type="button"
                className={secondary}
                onClick={() => void decide('deny')}
              >
                {t('connect.deny')}
              </button>
            </div>
          </>
        ) : null}
        {state.kind === 'signedOut' ? (
          <>
            <p className="mb-4 text-sm">{t('connect.signIn')}</p>
            <button type="button" className={primary} onClick={openApp}>
              {t('connect.open')}
            </button>
          </>
        ) : null}
        {state.kind === 'bad' ? (
          <p className="text-sm" role="alert">
            {t('connect.bad')}
          </p>
        ) : null}
        {state.kind === 'error' ? (
          <p className="text-sm" role="alert">
            {t('connect.error')}
          </p>
        ) : null}
      </div>
    </main>
  )
}
